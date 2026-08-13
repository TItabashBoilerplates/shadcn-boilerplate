/**
 * Mailpit から認証メールを取り出し、**6 桁コードと確認 URL の両方**を返す。
 *
 * 既存の `get-otp-from-mailpit.js` はログイン用 OTP に特化しているのに対し、
 * こちらは recovery / email_change / confirmation など**種類を問わず**扱える。
 * 本リポジトリのテンプレートは 1 通にリンクとコードを併記しているため、
 * Web（リンク方式）と Mobile（コード方式）の両方をこの 1 本で賄える。
 *
 * 環境変数:
 *   - MAILPIT_URL   : Mailpit API（default: http://localhost:54324）
 *   - TO_EMAIL      : 宛先で絞り込む（必須。取り違え防止）
 *   - SUBJECT_MATCH : 件名の部分一致（任意。複数通が飛ぶフローで使う）
 *   - MAX_RETRIES   : 最大リトライ（default: 20）
 *
 * 出力:
 *   - output.otpCode    : 6 桁コード
 *   - output.confirmUrl : /auth/confirm?token_hash=...&type=... の絶対 URL
 *   - output.messageId  : Mailpit のメッセージ ID
 */

const MAILPIT_API = `${typeof MAILPIT_URL !== "undefined" && MAILPIT_URL ? MAILPIT_URL : "http://localhost:54324"}/api/v1`;
const TARGET = typeof TO_EMAIL !== "undefined" ? TO_EMAIL : "";
const SUBJECT =
	typeof SUBJECT_MATCH !== "undefined" && SUBJECT_MATCH ? SUBJECT_MATCH : null;
const RETRIES =
	typeof MAX_RETRIES !== "undefined" && MAX_RETRIES
		? parseInt(MAX_RETRIES, 10)
		: 20;
const DELAY_MS = 1000;

if (!TARGET) {
	throw new Error("TO_EMAIL is required (取り違えを防ぐため宛先で絞り込む)");
}

function sleep(ms) {
	const start = Date.now();
	while (Date.now() - start < ms) {
		// Maestro の JS エンジンには setTimeout が無いのでビジーウェイト
	}
}

function listMessages() {
	const response = http.get(`${MAILPIT_API}/messages?limit=50`);
	if (response.code !== 200) {
		return [];
	}
	return JSON.parse(response.body).messages || [];
}

function matches(message) {
	const to = (message.To || []).map((entry) => entry.Address).join(",");
	if (to.indexOf(TARGET) === -1) {
		return false;
	}
	if (SUBJECT && (message.Subject || "").indexOf(SUBJECT) === -1) {
		return false;
	}
	return true;
}

function fetchBody(id) {
	const response = http.get(`${MAILPIT_API}/message/${id}`);
	if (response.code !== 200) {
		throw new Error(`Failed to fetch message ${id}: ${response.code}`);
	}
	const data = JSON.parse(response.body);
	return `${data.HTML || ""}\n${data.Text || ""}`;
}

let found = null;
for (let attempt = 0; attempt < RETRIES && !found; attempt += 1) {
	const message = listMessages().find(matches);
	if (message) {
		found = message;
		break;
	}
	sleep(DELAY_MS);
}

if (!found) {
	throw new Error(
		`No email for ${TARGET}${SUBJECT ? ` matching "${SUBJECT}"` : ""} after ${RETRIES}s`,
	);
}

const body = fetchBody(found.ID);

// 確認 URL。テンプレートは token_hash 形式で出しているのでそれを拾う
// （PKCE のため /auth/confirm を経由させる必要がある）。
const urlMatch = body.match(/https?:\/\/[^\s"'<>]*\/auth\/confirm[^\s"'<>]*/);
// 6 桁コード。タグや装飾を挟むことがあるのでタグを剥がしてから探す。
const plain = body.replace(/<[^>]*>/g, " ");
const codeMatch = plain.match(/\b(\d{6})\b/);

output.messageId = found.ID;
output.confirmUrl = urlMatch ? urlMatch[0].replace(/&amp;/g, "&") : "";
output.otpCode = codeMatch ? codeMatch[1] : "";

console.log(
	`auth email: id=${found.ID} code=${output.otpCode ? "found" : "none"} url=${output.confirmUrl ? "found" : "none"}`,
);
