import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "../..");
const require = createRequire(join(root, "frontend/package.json"));
const compiler = process.argv[2];
const executable =
	compiler === "tsrs"
		? (
				await import(
					pathToFileURL(
						join(
							dirname(require.resolve("tsrs/package.json")),
							"lib/getExePath.js",
						),
					).href
				)
			).default()
		: compiler;
const directories = ["apps", "packages", "packages/client"].flatMap(
	(directory) =>
		readdirSync(join(root, "frontend", directory), { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => join(root, "frontend", directory, entry.name)),
);
const projects = directories.filter((directory) => {
	try {
		return (
			existsSync(join(directory, "tsconfig.json")) &&
			JSON.parse(readFileSync(join(directory, "package.json"), "utf8"))
				.scripts?.["type-check"]
		);
	} catch (error) {
		if (error.code === "ENOENT") return false;
		throw error;
	}
});
projects.push(join(root, "drizzle"));
const cache = mkdtempSync(join(tmpdir(), "nerite-compiler-cache-"));
try {
	for (const [index, project] of projects.entries()) {
		const arguments_ = [
			"--noEmit",
			"--incremental",
			"--tsBuildInfoFile",
			join(cache, `${index}.tsbuildinfo`),
			"-p",
			join(project, "tsconfig.json"),
		];
		if (process.argv.includes("--fast")) arguments_.push("--fast");
		const result = spawnSync(executable, arguments_, {
			cwd: project,
			stdio: "inherit",
		});
		if (result.error) throw result.error;
		if (result.status !== 0) {
			process.exitCode = result.status ?? 1;
			break;
		}
	}
	if (!process.exitCode)
		console.log(
			`Checked ${projects.length} projects without incremental compiler caches`,
		);
} finally {
	rmSync(cache, { recursive: true, force: true });
}
