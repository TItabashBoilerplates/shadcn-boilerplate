/** ローカルの AAB を Play API へ直接提出する。公開は別途 store-release-play で行う。 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { api, PKG, token } from "./play-api-client.mjs";
import { APP_DIR } from "./store-config.mjs";

const [file, profile = "production"] = process.argv.slice(2);
if (!file) throw new Error("提出する AAB のパスがありません");
const config = JSON.parse(readFileSync(join(APP_DIR, "eas.json"), "utf8"));
const submit = config.submit?.[profile]?.android ?? {};
if (submit.releaseStatus && submit.releaseStatus !== "draft") {
	throw new Error(
		"ローカル提出は draft のみです。公開には store-release-play を使ってください",
	);
}
const track = submit.track ?? "internal";
const body = readFileSync(file);
const base = `/applications/${PKG}/edits`;
const edit = await api("POST", base);
if (!edit.id) throw new Error("Play edit ID を取得できませんでした");
const path = `${base}/${edit.id}`;

try {
	const current = await api(
		"GET",
		`${path}/tracks/${encodeURIComponent(track)}`,
	);
	if (current.releases?.some((release) => release.status === "draft")) {
		throw new Error(
			"既存の draft リリースがあります。先に配布・取り下げを確認してください",
		);
	}
	const response = await fetch(
		`https://androidpublisher.googleapis.com/upload/androidpublisher/v3${path}/bundles?uploadType=media`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${await token()}`,
				"Content-Type": "application/octet-stream",
			},
			body,
			signal: AbortSignal.timeout(120_000),
		},
	);
	const bundle = await response.json();
	if (!response.ok) {
		throw new Error(
			`AAB upload → ${response.status}: ${bundle.error?.message ?? "upload failed"}`,
		);
	}
	if (!Number.isInteger(bundle.versionCode) || bundle.versionCode <= 0) {
		throw new Error(
			"アップロードした AAB の versionCode を取得できませんでした",
		);
	}
	await api("PUT", `${path}/tracks/${encodeURIComponent(track)}`, {
		track,
		releases: [
			...(current.releases ?? []),
			{ status: "draft", versionCodes: [String(bundle.versionCode)] },
		],
	});
	await api(
		"POST",
		`${path}:commit?changesInReviewBehavior=ERROR_IF_IN_REVIEW`,
	);
} catch (error) {
	try {
		await api("DELETE", path);
	} catch (cleanupError) {
		throw new AggregateError(
			[error, cleanupError],
			"Play 提出と edit の削除に失敗しました",
			{ cause: error },
		);
	}
	throw error;
}
console.log(
	`Google Play の ${track} へ draft で直接提出しました。配布は store-release-play で行ってください。`,
);
