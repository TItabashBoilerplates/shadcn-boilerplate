/**
 * `ensure-test-user.js` が**作った**ユーザーだけを消す。
 *
 * `USER_ID` が空のときは何もしない。これは手抜きではなく仕様で、リモート
 * （staging / production）では既存アカウントをそのまま使うため `output.userId` が
 * 空になる。ここで消しにいくと**本物のアカウントを消す**ことになる。
 *
 * `onFlowComplete` はテストの成否に関わらず走る。**片付けに失敗したらここで
 * throw して落とす**（`.claude/rules/error-handling.md`: 握りつぶし禁止）。
 * 黙って続けると使い捨てユーザーが無限に溜まり、しかも誰も気づけない。
 *
 * 環境変数: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / USER_ID
 *
 * @see https://supabase.com/docs/reference/javascript/auth-admin-deleteuser
 */

const supabaseUrl =
	typeof SUPABASE_URL !== "undefined" && SUPABASE_URL
		? SUPABASE_URL
		: "http://localhost:54321";
const serviceRoleKey =
	typeof SUPABASE_SERVICE_ROLE_KEY !== "undefined" && SUPABASE_SERVICE_ROLE_KEY
		? SUPABASE_SERVICE_ROLE_KEY
		: "";
const userId = typeof USER_ID !== "undefined" && USER_ID ? USER_ID : "";

if (!userId || !serviceRoleKey) {
	// 既存アカウントモード（リモート）か、そもそも作っていない。
	output.cleaned = "skipped";
} else {
	const response = http.request(
		`${supabaseUrl}/auth/v1/admin/users/${userId}`,
		{
			method: "DELETE",
			headers: {
				Authorization: `Bearer ${serviceRoleKey}`,
				apikey: serviceRoleKey,
				"Content-Type": "application/json",
			},
		},
	);

	// `ok` は 2xx。DELETE は 200 / 204 のどちらもありうる。
	// （`response.code` は存在しない。`status` を見ること）
	if (response.ok) {
		output.cleaned = "deleted";
		output.deletedUserId = userId;
	} else {
		output.cleaned = "failed";
		output.cleanupError = `HTTP ${response.status} ${response.body}`;
		// 握りつぶさない。メッセージは Maestro の debug output（maestro.log）に残る。
		throw new Error(
			`cleanup-test-user: failed to delete ${userId}: ${output.cleanupError}`,
		);
	}
}
