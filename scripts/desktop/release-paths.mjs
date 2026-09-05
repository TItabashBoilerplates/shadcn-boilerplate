/**
 * デスクトップ配布物（Tauri）の Supabase Storage 上のパス規約。**ここが正本**。
 *
 * 消費者は 3 つ:
 *   - scripts/desktop/upload-release.mjs（CI / ローカルのアップロード）
 *   - frontend/apps/web の /download ページ（安定 URL の組み立て）
 *   - frontend/apps/desktop/src/shared/config/release-paths.test.ts（規約の固定）
 *
 * パス設計:
 *   desktop/v<version>/<Tauri の成果物ファイル名>   … 不変（過去の版を残す）
 *   desktop/latest/<固定名>                          … 安定 URL（upsert で差し替え）
 *
 * 固定名を version 入りにしないのは、Web 側がリリースのたびにデプロイし直さずに
 * 済むようにするため。latest/ は upsert + 短い cache-control で配る。
 */
import {
	readDesktopProductName,
	readUpdaterEndpoint,
} from "./desktop-version.mjs";

export const DESKTOP_RELEASES_BUCKET = "releases";

const DESKTOP_PREFIX = "desktop";

/**
 * latest/ に置く安定ファイル名。キーは配布プラットフォームの識別子。
 *
 * **`productName` から組み立てる**（`tauri.conf.json` が正本）。アプリを改名したら
 * 配布物の名前も変わるので、Web 側の定数（`views/download/model/downloadLinks.ts`）を
 * 追従させること — `downloadLinks.test.ts` がズレを検知して落ちる。
 *
 * macOS は **Apple Silicon（aarch64）のみ**を既定にしている。Intel Mac も配るなら
 * `"darwin-x64": \`${productName}-intel.dmg\`` を足し、`classifyArtifact` に
 * `_x64.dmg` の判定を戻し、`.github/workflows/desktop-release.yml` の matrix に
 * `x86_64-apple-darwin` を 1 エントリ追加する（この 3 か所だけ）。
 * universal 1 本にしない理由は runbook 参照（配布サイズが arch ぶん増える）。
 */
export const LATEST_ARTIFACT_NAMES = (() => {
	const productName = readDesktopProductName();
	return {
		"darwin-aarch64": `${productName}-apple-silicon.dmg`,
		"windows-x86_64": `${productName}-setup.exe`,
	};
})();

/**
 * 本番 Supabase の URL。**アプリに焼き込んだ updater の endpoint**
 * （`tauri.conf.json` の `plugins.updater.endpoints`）から導出する。
 *
 * ここを別に持つと「アプリが読む先」と「CI が書く先」が食い違いうる
 * （食い違っても両方成功し、更新だけが永久に届かない）。project ref は公開情報
 * （`NEXT_PUBLIC_SUPABASE_URL` としてブラウザにも出る）。
 *
 * **関数にしてあるのは、endpoint 未配線（雛形のまま）でもこのモジュールを import
 * できるようにするため**。読んだ時点で初めて落ちる（`readUpdaterEndpoint`）。
 */
export function productionSupabaseUrl() {
	const endpoint = new URL(readUpdaterEndpoint());
	return `${endpoint.protocol}//${endpoint.host}`;
}

/** endpoint が配線済みか（雛形のままの boilerplate では false） */
export function isUpdaterEndpointConfigured() {
	try {
		readUpdaterEndpoint();
		return true;
	} catch {
		return false;
	}
}

/**
 * tauri-plugin-updater が読む静的マニフェスト（`desktop/latest/latest.json`）。
 * 配布済みアプリがこの URL を持っているので、**動かせない**（動かすと旧版が更新不能になる）。
 */
export const LATEST_MANIFEST_PATH = `${DESKTOP_PREFIX}/latest/latest.json`;

export function versionedObjectPath(version, fileName) {
	return `${DESKTOP_PREFIX}/v${version}/${fileName}`;
}

export function latestObjectPath(platformKey) {
	const name = LATEST_ARTIFACT_NAMES[platformKey];
	if (!name) {
		throw new Error(
			`Unknown platform key: ${platformKey} (known: ${Object.keys(LATEST_ARTIFACT_NAMES).join(", ")})`,
		);
	}
	return `${DESKTOP_PREFIX}/latest/${name}`;
}

/** public バケットのオブジェクト URL（Supabase Storage の公開配信形式） */
export function publicReleaseUrl(supabaseUrl, objectPath) {
	const base = supabaseUrl.replace(/\/+$/, "");
	return `${base}/storage/v1/object/public/${DESKTOP_RELEASES_BUCKET}/${objectPath}`;
}

/**
 * Tauri の成果物ファイル名 → 配布プラットフォーム。
 * インストーラとして配るもの（arch 別 .dmg / NSIS の -setup.exe）だけを対象にし、
 * それ以外（.app.tar.gz / .msi / .sig / universal.dmg 等）は null（アップロード対象外）。
 * ファイル名規則は Tauri bundler の実装が正本（{productName}_{version}_{arch}.…）。
 */
export function classifyArtifact(fileName) {
	if (fileName.endsWith("_aarch64.dmg")) return "darwin-aarch64";
	if (fileName.endsWith("-setup.exe")) return "windows-x86_64";
	return null;
}

/**
 * `bundle.createUpdaterArtifacts: true` が生む自動更新の成果物の役割。
 *   macOS   : `{productName}.app.tar.gz`（payload）+ `.sig`（署名）
 *   Windows : NSIS の `-setup.exe` がそのまま payload、`-setup.exe.sig` が署名
 * プラットフォームはファイル名から決められない（macOS の payload に arch が無い）ので、
 * アップロード側が matrix の platform を明示して渡す。
 */
export function updaterArtifactRole(fileName) {
	if (
		fileName.endsWith(".app.tar.gz.sig") ||
		fileName.endsWith("-setup.exe.sig")
	) {
		return "signature";
	}
	if (fileName.endsWith(".app.tar.gz") || fileName.endsWith("-setup.exe")) {
		return "payload";
	}
	return null;
}
