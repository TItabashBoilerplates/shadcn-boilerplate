/**
 * Supabase Storage（public バケット `releases`）へのアップロード。
 * upload-release.mjs（インストーラ / updater payload）と publish-manifest.mjs（latest.json）が共有する。
 *
 * 依存ゼロ（fetch 直叩き）にしているのは、CI がリポジトリの workspace install に
 * 依存せず単体で動けるようにするため。
 */
import { readFileSync } from "node:fs";
import { DESKTOP_RELEASES_BUCKET } from "./release-paths.mjs";

/**
 * URL とキーは**同じソースのペア**で解決する。片方ずつ別ソースから拾うと、
 * direnv がローカル開発用に export している SUPABASE_URL=http://127.0.0.1:54321 と
 * Doppler の SB_SECRET_KEY が混ざり、**ローカル Supabase へアップロードして
 * 「Bucket not found」**になる（2026-08-31 に実測。CI は SB_* のみなので影響しなかった）。
 */
export function resolveStorageTarget() {
	if (process.env.SB_URL && process.env.SB_SECRET_KEY) {
		return { url: process.env.SB_URL, key: process.env.SB_SECRET_KEY };
	}
	if (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) {
		return {
			url: process.env.SUPABASE_URL,
			key: process.env.SUPABASE_SECRET_KEY,
		};
	}
	console.error(
		"✗ SB_URL + SB_SECRET_KEY（または SUPABASE_URL + SUPABASE_SECRET_KEY）のペアが必要です。",
	);
	process.exit(1);
}

/**
 * @param {{ url: string, key: string }} target
 * @param {string | Uint8Array} body ファイルパス（string）か本文（Uint8Array）
 * @param {string} objectPath バケット内のパス
 * @param {{ upsert: boolean, cacheSeconds: number, contentType?: string }} options
 */
export async function uploadObject(
	target,
	body,
	objectPath,
	{ upsert, cacheSeconds, contentType },
) {
	const url = `${target.url.replace(/\/+$/, "")}/storage/v1/object/${DESKTOP_RELEASES_BUCKET}/${objectPath}`;
	const payload = typeof body === "string" ? readFileSync(body) : body;
	let lastError = null;
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			const res = await fetch(url, {
				method: "POST",
				headers: {
					// 新形式キー（sb_secret_…）は JWT ではないため、Bearer 単独だと Storage が
					// 「Invalid Compact JWS」で 403 を返す（2026-08-31 の初回リリースで実測）。
					// supabase-js と同じく apikey ヘッダを併送すると新旧どちらのキーでも通る
					apikey: target.key,
					authorization: `Bearer ${target.key}`,
					"content-type": contentType ?? "application/octet-stream",
					"cache-control": `max-age=${cacheSeconds}`,
					"x-upsert": String(upsert),
				},
				body: payload,
			});
			if (res.ok) return;
			const text = (await res.text()).slice(0, 400);
			// 4xx はリトライしても直らない（バケット未作成・キー不正など）
			if (res.status < 500) {
				throw new Error(
					`upload failed (${res.status}): ${text}\n  → バケット未作成なら ENV=production devenv tasks run -P production deploy:buckets（config.toml が正本）`,
				);
			}
			lastError = new Error(`upload failed (${res.status}): ${text}`);
		} catch (err) {
			if (err instanceof Error && /upload failed \(4/.test(err.message))
				throw err;
			lastError = err;
		}
		console.error(`  … retry ${attempt}/3 (${objectPath})`);
		await new Promise((r) => setTimeout(r, 2000 * attempt));
	}
	throw lastError ?? new Error(`upload failed: ${objectPath}`);
}
