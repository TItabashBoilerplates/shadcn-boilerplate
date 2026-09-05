/**
 * 自動更新のマニフェスト（latest.json）を組み立てて公開する。**CI の最終 job**。
 *
 *   使い方: bun scripts/desktop/publish-manifest.mjs [--notes <text>] <fragment.json>...
 *   env   : SUPABASE_URL（または SB_URL）+ SUPABASE_SECRET_KEY（または SB_SECRET_KEY）
 *
 * 断片は upload-release.mjs が OS ごとに書いた `{ platform, url, signature }`。
 * 両 OS 分が揃っていないと buildUpdaterManifest が落とす（片方だけ更新が止まる公開をしない）。
 *
 * 置き場所:
 *   desktop/latest/latest.json     … アプリが読む（tauri.conf.json の endpoint。短キャッシュ）
 *   desktop/v<version>/latest.json … 記録用（不変）
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readDesktopVersion } from "./desktop-version.mjs";
import {
	LATEST_MANIFEST_PATH,
	publicReleaseUrl,
	versionedObjectPath,
} from "./release-paths.mjs";
import { resolveStorageTarget, uploadObject } from "./storage.mjs";
import { buildUpdaterManifest } from "./updater-manifest.mjs";

function parseArgs(argv) {
	const fragments = [];
	let notes;
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === "--notes") notes = argv[++i];
		else fragments.push(argv[i]);
	}
	return { fragments, notes };
}

async function main() {
	const { fragments: fragmentPaths, notes } = parseArgs(process.argv.slice(2));
	if (fragmentPaths.length === 0) {
		console.error(
			"使い方: bun scripts/desktop/publish-manifest.mjs [--notes <text>] <fragment.json>...",
		);
		process.exit(2);
	}

	const target = resolveStorageTarget();
	console.error(`→ upload target: ${new URL(target.url).host}`);

	const version = readDesktopVersion();
	const fragments = fragmentPaths.map((path) =>
		JSON.parse(readFileSync(resolve(path), "utf8")),
	);
	const manifest = buildUpdaterManifest({
		version,
		fragments,
		publishedAt: new Date(),
		notes,
	});
	const body = new TextEncoder().encode(
		`${JSON.stringify(manifest, null, 2)}\n`,
	);
	console.error(
		`→ latest.json (v${version}): ${Object.keys(manifest.platforms).join(", ")}`,
	);

	await uploadObject(
		target,
		body,
		versionedObjectPath(version, "latest.json"),
		{
			upsert: true,
			cacheSeconds: 31536000,
			contentType: "application/json",
		},
	);
	// アプリはこれを読む。差し替わるので短キャッシュ
	await uploadObject(target, body, LATEST_MANIFEST_PATH, {
		upsert: true,
		cacheSeconds: 60,
		contentType: "application/json",
	});
	console.error(`  ✓ ${LATEST_MANIFEST_PATH}`);
	console.log(publicReleaseUrl(target.url, LATEST_MANIFEST_PATH));
}

main().catch((err) => {
	console.error(`✗ ${err instanceof Error ? (err.stack ?? err.message) : err}`);
	process.exit(1);
});
