import { strict as assert } from "node:assert";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./sync-mcp.ts", import.meta.url));

function fixture(existing = false) {
	// macOS resolves /var to /private/var in cwd; compare the same physical checkout path.
	const root = Deno.realPathSync(Deno.makeTempDirSync({ prefix: "mcp-sync-" }));
	if (existing) {
		Deno.mkdirSync(`${root}/.codex`);
		Deno.mkdirSync(`${root}/.cursor`);
		Deno.writeTextFileSync(
			`${root}/.codex/config.toml`,
			'[mcp_servers.stale]\nurl = "https://stale.example/mcp"\n',
		);
		Deno.writeTextFileSync(
			`${root}/.cursor/mcp.json`,
			JSON.stringify({ other: true, mcpServers: { stale: {} } }),
		);
	}
	Deno.writeTextFileSync(
		`${root}/.mcp.json`,
		JSON.stringify({
			mcpServers: {
				local: {
					command: "bash",
					args: ["scripts/server.sh"],
					env: { MESSAGE: 'line1\nline2\t"quoted"\\end' },
				},
				remote: {
					type: "http",
					url: "https://example.com/mcp",
					headers: { Authorization: "Bearer test", "X-Test": "value" },
				},
			},
		}),
	);
	return root;
}

function run(root: string) {
	const result = new Deno.Command(Deno.execPath(), {
		args: ["run", "--allow-read", "--allow-write", script],
		cwd: root,
	}).outputSync();
	assert.equal(result.code, 0, new TextDecoder().decode(result.stderr));
	return Deno.readTextFileSync(`${root}/.codex/config.toml`);
}

Deno.test("fresh checkout creates config directories", () => {
	const root = fixture();
	try {
		assert.match(run(root), /\[mcp_servers.local\]/);
		assert.ok(
			JSON.parse(Deno.readTextFileSync(`${root}/.cursor/mcp.json`)).mcpServers
				.remote,
		);
	} finally {
		Deno.removeSync(root, { recursive: true });
	}
});

Deno.test("Codex uses http_headers and pins stdio cwd to the checkout", () => {
	const root = fixture(true);
	try {
		const output = run(root);
		assert.ok(output.includes(`cwd = ${JSON.stringify(root)}`));
		assert.match(
			output,
			/http_headers = \{ Authorization = "Bearer test", X-Test = "value" \}/,
		);
		assert.doesNotMatch(output, /^type =|^headers =/m);
	} finally {
		Deno.removeSync(root, { recursive: true });
	}
});

Deno.test("TOML strings escape control characters", () => {
	const root = fixture(true);
	try {
		assert.ok(
			run(root).includes(JSON.stringify('line1\nline2\t"quoted"\\end')),
		);
	} finally {
		Deno.removeSync(root, { recursive: true });
	}
});

Deno.test("resync removes stale servers, preserves Cursor settings and is idempotent", () => {
	const root = fixture(true);
	try {
		const output = run(root);
		assert.doesNotMatch(output, /stale/);
		const cursor = JSON.parse(
			Deno.readTextFileSync(`${root}/.cursor/mcp.json`),
		);
		assert.equal(cursor.other, true);
		assert.equal(cursor.mcpServers.stale, undefined);
		assert.equal(run(root), output);
	} finally {
		Deno.removeSync(root, { recursive: true });
	}
});
