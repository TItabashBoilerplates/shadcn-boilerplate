/**
 * desktop-release.yml の gate job。build を走らせるかを GITHUB_OUTPUT に書く。
 *
 *   使い方: bun scripts/desktop/check-release-gate.mjs
 *   env   : GITHUB_EVENT_NAME（`workflow_dispatch` なら公開済みの版を見ずに走らせる）
 *           GITHUB_OUTPUT（無ければ stdout に同じ形で出す）
 *   出力  : release=true|false / version=<tauri.conf.json の version>
 *
 * 公開済みの版は**アプリと同じ URL**（release-paths.mjs の endpoint）から読む。
 * public バケットなので資格情報は要らない。
 *
 * push で latest.json が読めないとき（まだ一度も公開していない / Storage の障害）は
 * **判定せず落とす**。推測で配布を始めない。初回の配布と障害時の再配布は
 * `desktop-release`（workflow_dispatch）で行う（manifest を見ない）。
 */
import { appendFileSync } from "node:fs";
import { readDesktopVersion } from "./desktop-version.mjs";
import { decideRelease } from "./release-gate.mjs";
import {
	LATEST_MANIFEST_PATH,
	productionSupabaseUrl,
	publicReleaseUrl,
} from "./release-paths.mjs";

async function fetchPublishedVersion(url) {
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(
			`公開済みの latest.json を読めません: ${res.status} ${res.statusText} (${url})。` +
				"初回の配布や障害時は desktop-release（手動実行）を使う",
		);
	}
	const manifest = await res.json();
	if (typeof manifest.version !== "string") {
		throw new Error(`latest.json に version がありません (${url})`);
	}
	return manifest.version;
}

function writeOutput(entries) {
	const lines = Object.entries(entries)
		.map(([key, value]) => `${key}=${value}\n`)
		.join("");
	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(process.env.GITHUB_OUTPUT, lines);
	} else {
		process.stdout.write(lines);
	}
}

async function main() {
	const event = process.env.GITHUB_EVENT_NAME ?? "push";
	const current = readDesktopVersion();
	// 手動実行は manifest を見ない（読めない状況からの復旧手段でもある）
	const published =
		event === "workflow_dispatch"
			? null
			: await fetchPublishedVersion(
					publicReleaseUrl(productionSupabaseUrl(), LATEST_MANIFEST_PATH),
				);
	const { release, reason } = decideRelease({ event, current, published });
	console.error(
		`→ ${reason} (event=${event}, current=v${current}, published=${published ? `v${published}` : "-"})`,
	);
	writeOutput({ release: String(release), version: current });
}

main().catch((err) => {
	console.error(`✗ ${err instanceof Error ? (err.stack ?? err.message) : err}`);
	process.exit(1);
});
