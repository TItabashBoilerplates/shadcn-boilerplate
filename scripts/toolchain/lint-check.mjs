import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	realpathSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);
const require = createRequire(path.join(root, "frontend/package.json"));
const mode = process.argv[2];
if (mode === "hook") {
	const files = process.argv
		.slice(3)
		.filter((file) => existsSync(path.resolve(root, file)));
	if (
		files.some((file) =>
			/(?:oxlint|eslint|biome|package\.json|bun\.lock)/.test(file),
		)
	) {
		for (const project of ["frontend", "drizzle"]) {
			const checked = spawnSync("bun", ["run", "lint:ci"], {
				cwd: path.join(root, project),
				stdio: "inherit",
			});
			if (checked.status !== 0) process.exit(checked.status ?? 1);
		}
		const checked = spawnSync(
			process.execPath,
			[path.join(root, "frontend/node_modules/oxlint/bin/oxlint"), "scripts"],
			{ cwd: root, stdio: "inherit" },
		);
		process.exit(checked.status ?? 1);
	}
	let failed = false;
	for (const app of ["web", "mobile", "desktop"]) {
		const prefix = `frontend/apps/${app}/`;
		const selected = files.filter((file) => file.startsWith(prefix));
		if (!selected.length) continue;
		const cwd = path.join(root, "frontend/apps", app);
		const checked = spawnSync(
			process.execPath,
			[
				path.join(root, "frontend/node_modules/oxlint/bin/oxlint"),
				"--deny-warnings",
				"--no-error-on-unmatched-pattern",
				"-c",
				"oxlint.config.mjs",
				...selected.map((file) => path.join(root, file)),
			],
			{ cwd, stdio: "inherit" },
		);
		failed ||= checked.status !== 0;
		if (app !== "desktop") {
			const compat = spawnSync(
				process.execPath,
				[
					path.join(
						path.dirname(require.resolve("eslint/package.json")),
						"bin/eslint.js",
					),
					"--no-config-lookup",
					"-c",
					"../../tooling/eslint/compat.mjs",
					"--max-warnings",
					"0",
					...selected.map((file) => path.join(root, file)),
				],
				{ cwd, stdio: "inherit" },
			);
			failed ||= compat.status !== 0;
		}
	}
	const other = files.filter(
		(file) => !/^frontend\/apps\/(web|mobile|desktop)\//.test(file),
	);
	if (other.length) {
		const checked = spawnSync(
			process.execPath,
			[
				path.join(root, "frontend/node_modules/oxlint/bin/oxlint"),
				"--no-error-on-unmatched-pattern",
				...other,
			],
			{ cwd: root, stdio: "inherit" },
		);
		failed ||= checked.status !== 0;
	}
	process.exit(failed ? 1 : 0);
}
if (mode === "test") {
	for (const app of ["web", "mobile", "desktop"]) {
		const appRoot = path.join(root, "frontend/apps", app);
		const cwd = realpathSync(
			mkdtempSync(path.join(tmpdir(), `nerite-lint-${app}-`)),
		);
		const config = path.join(cwd, "oxlint.config.mjs");
		const marker = `toolchain-probe-${process.pid}`;
		const dir = path.join(cwd, "src/features", marker);
		const shared = path.join(cwd, "src/shared/lib", `${marker}.ts`);
		try {
			// Keep deliberate violations outside real app sources and their watchers.
			// The production policy and resolver still run, with only the fixture's
			// local alias rebased to this temporary app.
			symlinkSync(
				path.join(root, "frontend/node_modules"),
				path.join(cwd, "node_modules"),
				process.platform === "win32" ? "junction" : "dir",
			);
			writeFileSync(
				path.join(cwd, "tsconfig.json"),
				JSON.stringify({
					extends: path.join(appRoot, "tsconfig.json"),
					compilerOptions: { paths: { "@/*": ["./src/*"] } },
					include: ["src/**/*.ts"],
				}),
			);
			writeFileSync(
				config,
				`
import production from ${JSON.stringify(pathToFileURL(path.join(appRoot, "oxlint.config.mjs")).href)};
export default {
  ...production,
  settings: {
    ...production.settings,
    'boundaries/root-path': ${JSON.stringify(cwd)},
    'import/resolver': {
      ...production.settings['import/resolver'],
      typescript: {
        ...production.settings['import/resolver'].typescript,
        project: ${JSON.stringify(path.join(cwd, "tsconfig.json"))},
      },
    },
  },
};
`,
			);
			mkdirSync(path.join(dir, "model"), { recursive: true });
			mkdirSync(path.dirname(shared), { recursive: true });
			writeFileSync(
				path.join(dir, "model/value.ts"),
				"export const value = 1\n",
			);
			for (const source of [
				`@/features/${marker}/model/value`,
				`../../features/${marker}/model/value`,
			]) {
				writeFileSync(
					shared,
					`import { value } from '${source}'\nexport const result = value\n`,
				);
				const result = spawnSync(
					process.execPath,
					[
						path.join(root, "frontend/node_modules/oxlint/bin/oxlint"),
						"--no-ignore",
						"-c",
						config,
						shared,
					],
					{ cwd, encoding: "utf8" },
				);
				if (
					result.status !== 1 ||
					!`${result.stdout}${result.stderr}`.includes("boundaries")
				)
					throw new Error(
						`${app}: forbidden ${source} was not rejected:\n${result.stdout}${result.stderr}`,
					);
			}
			writeFileSync(
				path.join(dir, "model/allowed.ts"),
				"import { value } from './value'\nexport const result = value\n",
			);
			const valid = spawnSync(
				process.execPath,
				[
					path.join(root, "frontend/node_modules/oxlint/bin/oxlint"),
					"--no-ignore",
					"-c",
					config,
					path.join(dir, "model/allowed.ts"),
				],
				{ cwd, encoding: "utf8" },
			);
			if (valid.status !== 0)
				throw new Error(
					`${app}: same-slice import rejected:\n${valid.stdout}${valid.stderr}`,
				);
			const other = path.join(cwd, "src/features", `${marker}-other`);
			mkdirSync(path.join(other, "model"), { recursive: true });
			try {
				const source = path.join(other, "model/value.ts");
				writeFileSync(
					source,
					`import { value } from '@/features/${marker}/model/value'\nexport const result = value\n`,
				);
				const cross = spawnSync(
					process.execPath,
					[
						path.join(root, "frontend/node_modules/oxlint/bin/oxlint"),
						"--no-ignore",
						"-c",
						config,
						source,
					],
					{ cwd, encoding: "utf8" },
				);
				if (
					cross.status !== 1 ||
					!`${cross.stdout}${cross.stderr}`.includes("boundaries")
				)
					throw new Error(`${app}: cross-slice import was not rejected`);
				mkdirSync(path.join(dir, "@x"), { recursive: true });
				writeFileSync(
					path.join(dir, "@x", `${marker}-other.ts`),
					"export const value = 1\n",
				);
				writeFileSync(
					source,
					`import { value } from '@/features/${marker}/@x/${marker}-other'\nexport const result = value\n`,
				);
				const crossApi = spawnSync(
					process.execPath,
					[
						path.join(root, "frontend/node_modules/oxlint/bin/oxlint"),
						"--no-ignore",
						"-c",
						config,
						source,
					],
					{ cwd, encoding: "utf8" },
				);
				if (
					crossApi.status !== 1 ||
					!`${crossApi.stdout}${crossApi.stderr}`.includes("boundaries")
				)
					throw new Error(`${app}: existing @x default-deny policy changed`);
				writeFileSync(shared, "export const value = 1\n");
				for (const specifier of [
					`@/shared/lib/${marker}`,
					"@workspace/tokens",
				]) {
					writeFileSync(
						source,
						`import * as dependency from '${specifier}'\nexport { dependency }\n`,
					);
					const lower = spawnSync(
						process.execPath,
						[
							path.join(root, "frontend/node_modules/oxlint/bin/oxlint"),
							"--no-ignore",
							"-c",
							config,
							source,
						],
						{ cwd, encoding: "utf8" },
					);
					if (lower.status !== 0)
						throw new Error(
							`${app}: allowed import ${specifier} rejected:\n${lower.stdout}${lower.stderr}`,
						);
				}
				writeFileSync(
					source,
					`import * as dependency from '@/missing-${marker}'\nexport { dependency }\n`,
				);
				const unresolved = spawnSync(
					process.execPath,
					[
						path.join(root, "frontend/node_modules/oxlint/bin/oxlint"),
						"--no-ignore",
						"-c",
						config,
						source,
					],
					{ cwd, encoding: "utf8" },
				);
				if (unresolved.status !== (app === "mobile" ? 1 : 0))
					throw new Error(
						`${app}: unresolved alias policy changed:\n${unresolved.stdout}${unresolved.stderr}`,
					);
			} finally {
				rmSync(other, { recursive: true });
			}
			console.log(
				`${app}: alias/relative upward and cross-slice rejected; same-slice, lower layer, workspace allowed`,
			);
		} finally {
			rmSync(cwd, { recursive: true });
		}
	}
} else if (mode === "check" || mode === "fix") {
	let failed = false;
	for (const app of ["web", "mobile", "desktop"]) {
		const result = spawnSync(
			process.execPath,
			[
				path.join(root, "frontend/node_modules/oxlint/bin/oxlint"),
				"-c",
				"oxlint.config.mjs",
				...(mode === "fix" ? ["--fix"] : []),
				".",
			],
			{ cwd: path.join(root, "frontend/apps", app), stdio: "inherit" },
		);
		failed ||= result.status !== 0;
	}
	process.exitCode = failed ? 1 : 0;
} else {
	throw new Error(`Unknown lint toolchain mode: ${mode}`);
}
