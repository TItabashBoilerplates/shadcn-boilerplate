/**
 * デスクトップのリリース（desktop-release.yml）を走らせるかの判定。**純粋関数だけ**。
 *
 * main へのマージで自動的にリリースするために、`tauri.conf.json` の version と
 * 本番 Storage に公開済みの latest.json の version を比べる。
 *
 *   - 手動実行（workflow_dispatch）… 版に関わらず走らせる（同じ版の再実行・巻き戻しの逃げ道）
 *   - push … 公開済みより**新しい版のときだけ**走らせる。同じ版（version を上げていない
 *     マージ）や古い版（巻き戻し）では走らせない
 *
 * 版は `x.y.z` の 3 つ組だけを受け付ける。tauri-plugin-updater は semver 比較で更新を
 * 判定するので、ここで別の形（プレリリース等）を通すとアプリ側の判定と食い違う。
 *
 * 呼び出し元は check-release-gate.mjs（CI の gate job）。
 * テストは frontend/apps/desktop/src/shared/config/release-gate.test.ts。
 */

const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)$/;

function parseVersion(version) {
	const match = VERSION_RE.exec(version);
	if (!match) {
		throw new Error(
			`version は x.y.z の形にする（受け取った値: ${JSON.stringify(version)}）`,
		);
	}
	return match.slice(1).map(Number);
}

/** `a` が `b` より新しければ 1、同じなら 0、古ければ -1 */
export function compareVersions(a, b) {
	const pa = parseVersion(a);
	const pb = parseVersion(b);
	for (let i = 0; i < 3; i++) {
		if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
	}
	return 0;
}

/**
 * @param {{ event: string, current: string, published: string }} input
 *   event     … GitHub Actions のイベント名（`workflow_dispatch` か `push`）
 *   current   … main の tauri.conf.json の version
 *   published … 公開済み latest.json の version
 * @returns {{ release: boolean, reason: string }}
 */
export function decideRelease({ event, current, published }) {
	parseVersion(current);
	if (event === "workflow_dispatch") {
		return { release: true, reason: `手動実行: v${current} を配布する` };
	}
	const cmp = compareVersions(current, published);
	if (cmp > 0) {
		return { release: true, reason: `v${published} → v${current} を配布する` };
	}
	if (cmp === 0) {
		return {
			release: false,
			reason: `v${current} は配布済み（version を上げていないので走らせない）`,
		};
	}
	return {
		release: false,
		reason: `v${current} は配布済みの v${published} より古い（巻き戻さない。必要なら desktop-release で手動実行する）`,
	};
}
