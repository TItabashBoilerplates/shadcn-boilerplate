/**
 * tauri-plugin-updater が読む静的マニフェスト（`latest.json`）の組み立て。**純粋関数だけ**。
 *
 * 形式（plugin/updater docs の "Static JSON File"）:
 *   { version, notes?, pub_date (RFC 3339), platforms: { "<os>-<arch>": { url, signature } } }
 *
 * platform key は `darwin-aarch64` / `windows-x86_64`（OS-ARCH）。アプリは自分の
 * key の url を取り、埋め込んだ公開鍵で signature を検証してから入れ替える。
 *
 * 呼び出し元は publish-manifest.mjs（CI の最終 job。両 OS の断片を束ねる）。
 * テストは frontend/apps/desktop/src/shared/config/updater-manifest.test.ts。
 */
import { LATEST_ARTIFACT_NAMES } from "./release-paths.mjs";

/** 配布するプラットフォームの集合はインストーラの固定名と同じ（1 か所で管理） */
export const UPDATER_PLATFORMS = Object.keys(LATEST_ARTIFACT_NAMES);

/**
 * @param {{ version: string, fragments: Array<{ platform: string, url: string, signature: string }>, publishedAt: Date, notes?: string }} input
 */
export function buildUpdaterManifest({
	version,
	fragments,
	publishedAt,
	notes,
}) {
	const platforms = {};
	for (const fragment of fragments) {
		if (!UPDATER_PLATFORMS.includes(fragment.platform)) {
			throw new Error(
				`unknown platform: ${fragment.platform} (known: ${UPDATER_PLATFORMS.join(", ")})`,
			);
		}
		if (platforms[fragment.platform]) {
			throw new Error(`duplicate platform: ${fragment.platform}`);
		}
		if (!fragment.signature) {
			throw new Error(`empty signature: ${fragment.platform}`);
		}
		// 本番モードの updater は TLS を強制する。http の URL を書くと更新が届かない
		if (!fragment.url.startsWith("https://")) {
			throw new Error(`url must be https: ${fragment.url}`);
		}
		platforms[fragment.platform] = {
			url: fragment.url,
			signature: fragment.signature,
		};
	}
	// 片方の OS が欠けたまま公開すると、その OS のユーザーだけ更新が止まる（エラーは出ない）
	for (const platform of UPDATER_PLATFORMS) {
		if (!platforms[platform]) throw new Error(`missing platform: ${platform}`);
	}

	return {
		version,
		pub_date: publishedAt.toISOString(),
		platforms,
		...(notes !== undefined ? { notes } : {}),
	};
}
