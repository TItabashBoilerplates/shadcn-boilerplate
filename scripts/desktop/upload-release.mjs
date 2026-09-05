/**
 * デスクトップ配布物を Supabase Storage の public バケット `releases` へアップロードする。
 *
 *   使い方: bun scripts/desktop/upload-release.mjs [--platform <key> --manifest-out <file>] <file|dir>...
 *   env   : SUPABASE_URL（または SB_URL）+ SUPABASE_SECRET_KEY（または SB_SECRET_KEY）
 *
 * インストーラ（.dmg / -setup.exe）は 2 か所へ置く:
 *   desktop/v<version>/<元のファイル名>  … 不変・長期キャッシュ（過去版の保全）
 *   desktop/latest/<固定名>              … upsert・短キャッシュ（Web の安定リンク先。
 *                                          Pro プランの Smart CDN が上書き後 ≤60 秒で伝播）
 *
 * `--platform` を渡すと**自動更新の成果物**も扱う（`bundle.createUpdaterArtifacts: true`
 * が生む payload と .sig。macOS は .app.tar.gz、Windows は -setup.exe がそのまま payload）:
 *   - payload を desktop/v<version>/ へ置く（updater は版付きの不変 URL を読む）
 *   - 署名の中身と payload の URL を `--manifest-out` に JSON 断片として書く。
 *     両 OS の断片を束ねて latest.json にするのは publish-manifest.mjs（CI の最終 job）
 *   payload か .sig が見つからなければ**落とす**（無言で「更新の来ない版」を出さない）。
 *
 * バージョンは tauri.conf.json の `version` を読む（引数で渡させると成果物と食い違う）。
 * 対象の判定・パス規約は release-paths.mjs が正本。それ以外（.msi 等）は黙って捨てず、
 * スキップとして名前を出す。
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { readDesktopVersion } from "./desktop-version.mjs";
import {
	classifyArtifact,
	LATEST_ARTIFACT_NAMES,
	latestObjectPath,
	publicReleaseUrl,
	updaterArtifactRole,
	versionedObjectPath,
} from "./release-paths.mjs";
import { resolveStorageTarget, uploadObject } from "./storage.mjs";

function parseArgs(argv) {
	const paths = [];
	let platform = null;
	let manifestOut = null;
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--platform") platform = argv[++i] ?? null;
		else if (arg === "--manifest-out") manifestOut = argv[++i] ?? null;
		else paths.push(arg);
	}
	if ((platform === null) !== (manifestOut === null)) {
		throw new Error(
			"--platform と --manifest-out は両方渡す（updater の断片を書く先が要る）",
		);
	}
	if (platform !== null && !(platform in LATEST_ARTIFACT_NAMES)) {
		throw new Error(
			`--platform が不正: ${platform}（known: ${Object.keys(LATEST_ARTIFACT_NAMES).join(", ")}）`,
		);
	}
	return { paths, platform, manifestOut };
}

/** 引数（ファイル or ディレクトリ）から配布候補ファイルを列挙する（重複除去） */
function collectFiles(args) {
	const seen = new Set();
	const out = [];
	const visit = (path) => {
		const stat = statSync(path);
		if (stat.isFile()) {
			if (!seen.has(path)) {
				seen.add(path);
				out.push(path);
			}
			return;
		}
		for (const entry of readdirSync(path, { withFileTypes: true })) {
			const child = join(path, entry.name);
			// .app は数百ファイルのディレクトリ。中身は配布対象にならない（tar.gz が payload）
			if (entry.isDirectory() && entry.name.endsWith(".app")) continue;
			visit(child);
		}
	};
	for (const arg of args) visit(resolve(arg));
	return out;
}

async function main() {
	const { paths, platform, manifestOut } = parseArgs(process.argv.slice(2));
	if (paths.length === 0) {
		console.error(
			"使い方: bun scripts/desktop/upload-release.mjs [--platform <key> --manifest-out <file>] <file|dir>...",
		);
		process.exit(2);
	}

	const target = resolveStorageTarget();
	// どこへ上げるかを常に可視化する（ホスト名は公開情報。取り違えをログで即座に気づけるように）
	console.error(`→ upload target: ${new URL(target.url).host}`);

	const version = readDesktopVersion();
	const files = collectFiles(paths);
	const installers = [];
	let payload = null;
	let signature = null;
	for (const path of files) {
		const name = basename(path);
		const installerPlatform = classifyArtifact(name);
		const role = platform ? updaterArtifactRole(name) : null;
		if (installerPlatform)
			installers.push({ path, platform: installerPlatform });
		if (role === "payload") payload = path;
		if (role === "signature") signature = path;
		if (!installerPlatform && !role)
			console.error(`- skip (配布対象外): ${name}`);
	}

	if (installers.length === 0) {
		console.error(
			"✗ 配布対象のインストーラ（.dmg / -setup.exe）が見つかりません。",
		);
		process.exit(1);
	}

	const uploaded = new Set();
	for (const { path, platform: installerPlatform } of installers) {
		const fileName = basename(path);
		const versioned = versionedObjectPath(version, fileName);
		const latest = latestObjectPath(installerPlatform);
		const sizeMb = (statSync(path).size / 1024 / 1024).toFixed(1);
		console.error(`↑ ${fileName} (${sizeMb} MB, ${installerPlatform})`);

		// 版付きは実質 immutable なので 1 年キャッシュ。再実行に備えて upsert は許す
		await uploadObject(target, path, versioned, {
			upsert: true,
			cacheSeconds: 31536000,
		});
		uploaded.add(path);
		console.error(`  ✓ ${versioned}`);
		// latest はリリースごとに差し替わるので短く（Smart CDN の invalidation が主で、これは保険）
		await uploadObject(target, path, latest, {
			upsert: true,
			cacheSeconds: 60,
		});
		console.error(`  ✓ ${latest}`);
		console.log(publicReleaseUrl(target.url, latest));
	}

	if (platform) {
		if (!payload || !signature) {
			console.error(
				`✗ updater の成果物が揃っていません（payload: ${payload ?? "無し"} / signature: ${signature ?? "無し"}）。` +
					" tauri build に --config src-tauri/tauri.release.conf.json と TAURI_SIGNING_PRIVATE_KEY を渡したか確認。",
			);
			process.exit(1);
		}
		const payloadObject = versionedObjectPath(version, basename(payload));
		if (!uploaded.has(payload)) {
			const sizeMb = (statSync(payload).size / 1024 / 1024).toFixed(1);
			console.error(`↑ ${basename(payload)} (${sizeMb} MB, updater payload)`);
			await uploadObject(target, payload, payloadObject, {
				upsert: true,
				cacheSeconds: 31536000,
			});
			console.error(`  ✓ ${payloadObject}`);
		}
		const fragment = {
			platform,
			url: publicReleaseUrl(target.url, payloadObject),
			signature: readFileSync(signature, "utf8").trim(),
		};
		writeFileSync(manifestOut, `${JSON.stringify(fragment, null, 2)}\n`);
		console.error(`  ✓ manifest fragment → ${manifestOut}`);
	}
}

main().catch((err) => {
	console.error(`✗ ${err instanceof Error ? (err.stack ?? err.message) : err}`);
	process.exit(1);
});
