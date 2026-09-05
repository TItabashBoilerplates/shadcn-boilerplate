/**
 * デスクトップアプリの identity（`tauri.conf.json` の `version` / `productName` /
 * 自動更新の endpoint）を読む。**tauri.conf.json が正本**。
 *
 * 成果物のファイル名・`desktop/v<version>/` のパス・latest.json の version は
 * すべてここから決まる。引数や env で渡させると成果物と食い違うので、
 * 読む側（release-paths / upload-release / publish-manifest / check-release-gate）は
 * 必ずここを使う。
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const TAURI_CONF_PATH = join(
	REPO_ROOT,
	"frontend/apps/desktop/src-tauri/tauri.conf.json",
);

export function readTauriConf() {
	return JSON.parse(readFileSync(TAURI_CONF_PATH, "utf8"));
}

export function readDesktopVersion() {
	const conf = readTauriConf();
	if (!conf.version) throw new Error("tauri.conf.json に version がありません");
	return conf.version;
}

/**
 * バンドル名。Tauri の成果物ファイル名（`{productName}_{version}_{arch}.dmg` 等）と
 * `desktop/latest/` の固定名がこれを含むので、**改名すると配布物の名前も変わる**
 * （latest/ の旧名は残るが、以後は更新されなくなる）。
 */
export function readDesktopProductName() {
	const conf = readTauriConf();
	if (!conf.productName)
		throw new Error("tauri.conf.json に productName がありません");
	return conf.productName;
}

/**
 * 自動更新の endpoint（`plugins.updater.endpoints[0]`）。
 *
 * **配布済みアプリに焼き込まれている URL** なので、これが公開先の正本でもある
 * （CI のアップロード先も、gate が読む公開済み manifest も、必ずここと同じホストになる）。
 * 未設定なら落とす — 推測で別のホストへ配ってはならない。
 */
export function readUpdaterEndpoint() {
	const conf = readTauriConf();
	const endpoints = conf.plugins?.updater?.endpoints ?? [];
	const endpoint = endpoints[0];
	if (!endpoint || !/^https:\/\//.test(endpoint)) {
		throw new Error(
			"tauri.conf.json の plugins.updater.endpoints が未設定です。" +
				" `desktop-updater-keygen --supabase-url https://<ref>.supabase.co` で配線してください" +
				"（docs/desktop/release-runbook.md）。",
		);
	}
	return endpoint;
}
