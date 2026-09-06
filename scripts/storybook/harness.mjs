/**
 * storybook-static を headless Chromium で開くための共通部品。
 *
 * `screenshots-storybook`（掲載画像の撮影）と `storybook-smoke`（描画チェック）が
 * 同じことをするので、ここに 1 つだけ置く（`.claude/rules/clean-code.md`）。
 *
 * ここに置くのは「Storybook をブラウザで開くまで」だけ。**何を見るか**は
 * 呼び出し側の責務にする（撮影とスモークで見るものが違うため）。
 */
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = resolve(__dirname, "../..");
export const STORYBOOK_STATIC = join(REPO_ROOT, "frontend/storybook-static");

/**
 * playwright-core は frontend の devDependency（ブラウザを自動 DL しない軽量版）。
 * `scripts/` 配下は node の通常解決で frontend/node_modules に届かないため、
 * frontend の package.json を基点に解決する。
 */
export const frontendRequire = createRequire(
	pathToFileURL(join(REPO_ROOT, "frontend/package.json")),
);

const MIME = {
	".html": "text/html",
	".js": "text/javascript",
	".mjs": "text/javascript",
	".css": "text/css",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".svg": "image/svg+xml",
	".woff2": "font/woff2",
	".woff": "font/woff",
	".ttf": "font/ttf",
	".map": "application/json",
};

/** storybook-static を配信する最小サーバ（依存を足さないため自前） */
export function serveStatic(root) {
	const server = createServer((req, res) => {
		const urlPath = decodeURIComponent(req.url.split("?")[0]);
		const file = join(root, urlPath === "/" ? "/index.html" : urlPath);
		if (!file.startsWith(root)) {
			res.writeHead(403).end();
			return;
		}
		if (!existsSync(file)) {
			res.writeHead(404).end("not found");
			return;
		}
		try {
			const body = readFileSync(file);
			res.writeHead(200, {
				"content-type": MIME[extname(file)] ?? "application/octet-stream",
			});
			res.end(body);
		} catch {
			res.writeHead(500).end();
		}
	});
	return new Promise((r) =>
		server.listen(0, "127.0.0.1", () =>
			r({ server, port: server.address().port }),
		),
	);
}

/**
 * Chromium の実行ファイルを探す。
 *
 * playwright-core はブラウザを同梱しないので、実行体は外から供給する:
 *   - 開発者 / CI: `devenv shell -P store-listing`（`pkgs.chromium` が PATH に入る）
 *   - それ以外: `PLAYWRIGHT_CHROMIUM_PATH` で明示
 */
export function findChromium() {
	const candidates = [
		process.env.PLAYWRIGHT_CHROMIUM_PATH,
		process.env.CHROME_BIN,
		// devenv の store-listing profile が入れる chromium
		...(process.env.PATH ?? "")
			.split(":")
			.flatMap((d) => [
				join(d, "chromium"),
				join(d, "chromium-browser"),
				join(d, "google-chrome"),
			]),
		// CCR / web-sandbox のプリインストール
		"/opt/pw-browsers/chromium",
		"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
	].filter(Boolean);
	for (const c of candidates) if (existsSync(c)) return c;
	throw new Error(
		"Chromium が見つかりません。`devenv shell -P store-listing` に入るか、" +
			"PLAYWRIGHT_CHROMIUM_PATH で実行ファイルのパスを指定してください。",
	);
}

/**
 * ビルド済み storybook-static を配信して baseUrl を返す。
 * `--url` で起動中の Storybook を指した場合はサーバを立てない。
 */
export async function openStorybook(explicitUrl) {
	if (explicitUrl) return { baseUrl: explicitUrl, server: null };

	if (!existsSync(join(STORYBOOK_STATIC, "index.json"))) {
		throw new Error(
			`storybook-static がありません: ${STORYBOOK_STATIC}\n` +
				"先に `build-storybook` を実行するか、--url で起動中の Storybook を指定してください。",
		);
	}
	const { server, port } = await serveStatic(STORYBOOK_STATIC);
	return { baseUrl: `http://127.0.0.1:${port}`, server };
}

/**
 * `index.json` から story を列挙する（`docs` エントリは描画対象ではないので除く）。
 * 返すのは `{ id, title, name }` の配列。
 */
export function listStories() {
	const indexPath = join(STORYBOOK_STATIC, "index.json");
	const index = JSON.parse(readFileSync(indexPath, "utf8"));
	return Object.entries(index.entries ?? {})
		.filter(([, entry]) => entry.type === "story")
		.map(([id, entry]) => ({ id, title: entry.title, name: entry.name }));
}
