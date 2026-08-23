/**
 * Mailpit から認証メールを取り出し、**6 桁コードと確認 URL の両方**を返す。
 *
 * 本リポジトリのメールテンプレートは 1 通にリンク（`token_hash` 形式）と
 * コード（`{{ .Token }}`）を併記しているので、Web（リンク方式）と
 * Mobile（コード方式）をこの 1 本で賄える。
 *
 * ## ローカル専用
 *
 * Mailpit は `supabase start` が立てるローカルのメールサーバ。**リモート環境には
 * 存在しない**ので、このスクリプトを使うフローには `mailbox` タグを付け、
 * `config.remote.yaml` 側で除外している。
 *
 * ## 環境変数
 *   MAIL_API_URL  … Mailpit のベース URL（default: http://localhost:54324）
 *   TO_EMAIL      … 宛先で絞り込む（必須。取り違え防止）
 *   SUBJECT_MATCH … 件名の部分一致（任意。複数通が飛ぶフローで使う）
 *   MAX_RETRIES   … 最大リトライ秒数（default: 20）
 *
 * ## 出力
 *   output.otpCode / output.confirmUrl / output.messageId
 *
 * @see https://mailpit.axllent.org/docs/api-v1/
 */

const mailApiBase =
	typeof MAIL_API_URL !== "undefined" && MAIL_API_URL
		? MAIL_API_URL
		: "http://localhost:54324";
const MAILPIT_API = `${mailApiBase}/api/v1`;
const target = typeof TO_EMAIL !== "undefined" && TO_EMAIL ? TO_EMAIL : "";
const subject =
	typeof SUBJECT_MATCH !== "undefined" && SUBJECT_MATCH ? SUBJECT_MATCH : "";
const retries =
	typeof MAX_RETRIES !== "undefined" && MAX_RETRIES
		? parseInt(MAX_RETRIES, 10)
		: 20;
const DELAY_MS = 1000;

if (!target) {
	throw new Error("TO_EMAIL is required (宛先で絞らないとメールを取り違える)");
}

// Maestro の JS エンジンには setTimeout が無いのでビジーウェイト。
function sleep(ms) {
	const start = Date.now();
	while (Date.now() - start < ms) {
		// busy wait
	}
}

function listMessages() {
	const response = http.get(`${MAILPIT_API}/messages?limit=50`);
	// `response.code` は存在しない。`ok` / `status` を見る。
	if (!response.ok) {
		throw new Error(
			`Mailpit not reachable at ${mailApiBase}: HTTP ${response.status}`,
		);
	}
	return json(response.body).messages || [];
}

function matches(message) {
	const to = (message.To || [])
		.map((entry) => entry.Address)
		.join(",")
		.toLowerCase();
	if (to.indexOf(target.toLowerCase()) === -1) {
		return false;
	}
	if (subject && (message.Subject || "").indexOf(subject) === -1) {
		return false;
	}
	return true;
}

function fetchBody(id) {
	const response = http.get(`${MAILPIT_API}/message/${id}`);
	if (!response.ok) {
		throw new Error(`Failed to fetch message ${id}: HTTP ${response.status}`);
	}
	const data = json(response.body);
	return `${data.HTML || ""}\n${data.Text || ""}`;
}

let found = null;
for (let attempt = 0; attempt < retries && !found; attempt += 1) {
	const messages = listMessages();
	for (let i = 0; i < messages.length; i += 1) {
		if (matches(messages[i])) {
			found = messages[i];
			break;
		}
	}
	if (!found) {
		sleep(DELAY_MS);
	}
}

if (!found) {
	throw new Error(
		`No email for ${target}${subject ? ` matching "${subject}"` : ""} after ${retries}s`,
	);
}

const body = fetchBody(found.ID);

// 確認 URL。テンプレートは token_hash 形式で出している（PKCE のため
// /auth/confirm をサーバー側で通す必要がある）。
const urlMatch = body.match(/https?:\/\/[^\s"'<>]*\/auth\/confirm[^\s"'<>]*/);
// 6 桁コード。タグや装飾を挟むことがあるのでタグを剥がしてから探す。
const plain = body.replace(/<[^>]*>/g, " ");
const codeMatch = plain.match(/\b(\d{6})\b/);

output.messageId = found.ID;
output.confirmUrl = urlMatch ? urlMatch[0].replace(/&amp;/g, "&") : "";
output.otpCode = codeMatch ? codeMatch[1] : "";

// リンクもコードも取れないメールは、たいてい**テンプレートが配線されていない**。
// 既定の Supabase テンプレートは `{{ .ConfirmationURL }}`（/auth/v1/verify 形式）
// しか含まないので、`@supabase/ssr`（PKCE）が要求する
// `/auth/confirm?token_hash=...` にも 6 桁コードにもならない。
// ここで黙って空を返すと「openLink で空文字」という分かりにくい失敗になるため、
// 原因と直し方を名指しで投げる。
if (!output.confirmUrl && !output.otpCode) {
	throw new Error(
		`Found the email for ${target} but it has neither a /auth/confirm link nor a 6-digit code. ` +
			"The auth email templates are probably not wired: set [auth.email.template.*] " +
			"content_path in supabase/config.toml (see .claude/rules/supabase-config.md §2).",
	);
}

// 読み終わったメールは消す。残すと次のフローが古い方を拾う。
http.request(`${MAILPIT_API}/message/${found.ID}`, { method: "DELETE" });
