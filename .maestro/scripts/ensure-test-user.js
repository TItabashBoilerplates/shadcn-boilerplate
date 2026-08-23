/**
 * テスト用アカウントを「その環境で可能なやり方」で用意する。
 *
 * ## なぜ 1 本にまとめているか
 *
 * 同じフローをローカルでもリモート（staging / production）でも走らせたいが、
 * **本番に対して service_role でユーザーを作ることはできない**（鍵を渡すこと自体が
 * 事故になる）。かといって環境ごとにフローを分けると、同じ画面遷移が 2 本になり
 * 片方だけ腐る。
 *
 * そこで「用意の仕方」だけをこのスクリプトに閉じ込め、**フロー側は
 * `${output.testEmail}` / `${output.testPassword}` を使うだけ**にしてある。
 *
 * | 条件 | 動作 |
 * |---|---|
 * | `SUPABASE_SERVICE_ROLE_KEY` がある（ローカル / 使い捨て環境） | Admin API で使い捨てユーザーを作る。`output.userId` を返すので後で消せる |
 * | 無く `E2E_EMAIL` / `E2E_PASSWORD` がある（staging / production） | 既存アカウントをそのまま使う。`output.userId` は空 = cleanup は何もしない |
 * | どちらも無い | エラー（黙って進むと「なぜか落ちるテスト」になる） |
 *
 * production で使うのは**ストア審査用のデモアカウント**を想定している
 * （`.claude/rules/auth.md` / `docs/store/`）。これを E2E で毎回通しておくと、
 * 「審査に出す直前に資格情報が失効していた」を事前に検知できる。
 *
 * ## 環境変数
 *   SUPABASE_URL              … Supabase の API URL
 *   SUPABASE_SERVICE_ROLE_KEY … あれば作成モード
 *   E2E_EMAIL / E2E_PASSWORD  … 無ければ既存アカウントモード
 *   TEST_PASSWORD             … 作成モードで使うパスワード（要件を満たす値）
 *   TEST_EMAIL                … 作成モードでアドレスを固定したいとき
 *
 * ## 出力
 *   output.testEmail / output.testPassword / output.userId / output.accessToken
 *
 * @see https://supabase.com/docs/reference/javascript/auth-admin-createuser
 */

// Maestro は runScript の `env:` をグローバル変数として注入する。未注入でも
// 落ちないよう typeof で守る（Maestro 外から node で読んで検算できるようにも）。
const supabaseUrl =
	typeof SUPABASE_URL !== "undefined" && SUPABASE_URL
		? SUPABASE_URL
		: "http://localhost:54321";
const serviceRoleKey =
	typeof SUPABASE_SERVICE_ROLE_KEY !== "undefined" && SUPABASE_SERVICE_ROLE_KEY
		? SUPABASE_SERVICE_ROLE_KEY
		: "";
const publishableKey =
	typeof SUPABASE_PUBLISHABLE_KEY !== "undefined" && SUPABASE_PUBLISHABLE_KEY
		? SUPABASE_PUBLISHABLE_KEY
		: "";
const providedEmail =
	typeof E2E_EMAIL !== "undefined" && E2E_EMAIL ? E2E_EMAIL : "";
const providedPassword =
	typeof E2E_PASSWORD !== "undefined" && E2E_PASSWORD ? E2E_PASSWORD : "";

// パスワード要件は Supabase 側（12 文字以上 + 大小英字 + 数字 + 記号）。
// 緩い値にすると 422 で弾かれ、フロー全体が「原因の分かりにくい失敗」になる。
const testPassword =
	typeof TEST_PASSWORD !== "undefined" && TEST_PASSWORD
		? TEST_PASSWORD
		: "E2ePassw0rd!x";
const testEmail =
	typeof TEST_EMAIL !== "undefined" && TEST_EMAIL
		? TEST_EMAIL
		: `e2e_${Date.now()}@test.local`;

/**
 * `http.get/post/...` の戻り値は `{ ok, status, body, headers }`。
 * **`code` というプロパティは存在しない**（Maestro 2.4.0 実測 / 公式ドキュメント）。
 * ここを間違えると成功時でも常に失敗するので、判定は必ずこの関数を通す。
 */
function ensureOk(response, what) {
	if (!response.ok) {
		throw new Error(`${what} failed: HTTP ${response.status} ${response.body}`);
	}
	return response;
}

function signIn(email, password) {
	const response = http.post(
		`${supabaseUrl}/auth/v1/token?grant_type=password`,
		{
			headers: {
				apikey: serviceRoleKey || publishableKey,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ email: email, password: password }),
		},
	);
	ensureOk(response, "sign in as test user");
	return json(response.body);
}

if (serviceRoleKey) {
	// --- 作成モード（ローカル / 使い捨て環境）-------------------------------
	const created = http.post(`${supabaseUrl}/auth/v1/admin/users`, {
		headers: {
			Authorization: `Bearer ${serviceRoleKey}`,
			apikey: serviceRoleKey,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			email: testEmail,
			password: testPassword,
			// 確認メールの往復は「サインアップの E2E」の担当。ログイン系のフローで
			// 毎回それを踏むと、落ちたときにどちらの問題か切り分けられなくなる。
			email_confirm: true,
			user_metadata: { created_by: "maestro_e2e" },
		}),
	});
	ensureOk(created, "create test user");
	const user = json(created.body);

	const session = signIn(testEmail, testPassword);

	output.testEmail = testEmail;
	output.testPassword = testPassword;
	output.userId = user.id;
	output.accessToken = session.access_token;
	output.mode = "created";
} else if (providedEmail && providedPassword) {
	// --- 既存アカウントモード（staging / production）------------------------
	// 消してはいけないアカウントなので userId は返さない（cleanup が誤爆しない）。
	output.testEmail = providedEmail;
	output.testPassword = providedPassword;
	output.userId = "";
	output.accessToken = "";
	output.mode = "provided";
} else {
	throw new Error(
		"No way to obtain a test account: set SUPABASE_SERVICE_ROLE_KEY (local) " +
			"or E2E_EMAIL + E2E_PASSWORD (remote).",
	);
}
