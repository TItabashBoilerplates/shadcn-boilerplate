import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const wrapper = resolve(
	import.meta.dirname,
	"../../frontend/tooling/tsc/bin.mjs",
);
const directory = mkdtempSync(resolve(tmpdir(), "nerite-types-"));
const run = (args) =>
	spawnSync(process.execPath, [wrapper, ...args], {
		cwd: directory,
		encoding: "utf8",
		timeout: 30000,
		env: { ...process.env, WORKSPACE_TSC_VERBOSE: "1" },
	});

try {
	const version = run(["--version"]);
	assert.equal(version.status, 0, version.stderr);
	assert.match(version.stderr, /using tsrs@/);
	writeFileSync(
		resolve(directory, "tsconfig.json"),
		JSON.stringify({
			compilerOptions: {
				strict: true,
				noEmit: true,
				skipLibCheck: true,
				target: "es2022",
				module: "esnext",
				types: [],
				incremental: true,
			},
			files: ["index.ts"],
		}),
	);
	const valid = 'const value: string = "ok"; export { value }\n';
	writeFileSync(resolve(directory, "index.ts"), valid);
	assert.equal(run([]).status, 0);
	writeFileSync(
		resolve(directory, "index.ts"),
		`
    export const value: string = 123;
    function identity<T>(input: T): T { return input }
    identity<number>('invalid');
    declare const optional: string | null;
    optional.toUpperCase();
  `,
	);
	const invalid = run([]);
	assert.notEqual(invalid.status, 0);
	for (const diagnostic of ["TS2322", "TS2345", "TS18047"]) {
		assert.ok(
			invalid.stdout.includes(diagnostic),
			invalid.stdout + invalid.stderr,
		);
	}
	writeFileSync(resolve(directory, "index.ts"), valid);
	const repaired = run([]);
	assert.equal(repaired.status, 0, repaired.stdout + repaired.stderr);
	if (process.platform !== "win32") {
		for (const preload of [
			[],
			["--import", "data:text/javascript,process.execve=undefined"],
		]) {
			const watcher = spawn(
				process.execPath,
				[...preload, wrapper, "--watch"],
				{
					cwd: directory,
				},
			);
			watcher.stderr.resume();
			try {
				await once(watcher.stdout, "data", {
					signal: AbortSignal.timeout(10000),
				});
				const closed = once(watcher, "exit");
				watcher.kill("SIGTERM");
				const [, signal] = await closed;
				assert.equal(signal, "SIGTERM");
			} finally {
				watcher.kill("SIGKILL");
			}
		}
	}
	console.log(
		"tsrs: version, strict diagnostics and incremental invalidation passed",
	);
} finally {
	rmSync(directory, { recursive: true, force: true });
}
