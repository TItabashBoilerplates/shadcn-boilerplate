import { createClient } from "@supabase/supabase-js";
import { createFunctionLogger } from "../shared/logger/index.ts";
import type { Database } from "../shared/types/supabase/schema.ts";

const logger = createFunctionLogger("delete-account");

/**
 * アプリ内アカウント削除
 *
 * ## なぜ Edge Function なのか
 *
 * ユーザーの削除は `auth.admin.deleteUser()` でしか行えず、これは **service_role**
 * を要求する。service_role をクライアントに置くことは絶対にできない
 * （`.claude/skills/supabase/` のセキュリティチェックリスト）ため、
 * 「クライアントから直接 Supabase を叩く」原則の例外としてサーバー側に置く
 * （`.claude/rules/supabase-first.md` の判断順で Edge Functions が該当）。
 *
 * ## なぜ必須なのか
 *
 * App Store Review Guideline **5.1.1(v)**: アカウント作成ができるアプリは
 * **アプリ内での削除**を提供しなければならない。「サポートへ連絡してください」は
 * 要件を満たさない。
 *
 * ## 誰を消すか
 *
 * **リクエストの JWT から解決した本人だけ**を消す。body で受け取った id は
 * 一切信用しない（他人のアカウントを消せる穴になる）。
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 破壊的操作なので GET では絶対に受けない（リンクのプリフェッチで消える事故を防ぐ）
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "missing_authorization" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  // 新旧どちらのキー名でも動くようにする（platform が自動提供する default secrets）
  const secretKey = Deno.env.get("SUPABASE_SECRET_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  if (!supabaseUrl || !secretKey || !publishableKey) {
    logger.error("Missing Supabase environment variables");
    return json({ error: "server_misconfigured" }, 500);
  }

  // 1) 呼び出し元の JWT を検証して本人を特定する。
  //    getUser() は Auth サーバーに問い合わせて検証するので、改竄された JWT は弾かれる。
  const callerClient = createClient<Database>(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: userError } = await callerClient.auth
    .getUser();

  if (userError || !user) {
    logger.warn("Delete account called without a valid session", {
      error: userError?.message,
    });
    return json({ error: "unauthorized" }, 401);
  }

  // 2) service_role で本人だけを削除する。
  const adminClient = createClient<Database>(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 削除してもアクセストークンは即座に無効化されない（期限まで有効）。
  // 先にセッションを失効させてから消す。
  const { error: signOutError } = await adminClient.auth.admin.signOut(
    authHeader.replace("Bearer ", ""),
    "global",
  );
  if (signOutError) {
    // 失効に失敗しても削除自体は続ける（残存トークンは JWT 期限で失効する）。
    // 握りつぶさずログには必ず残す。
    logger.warn("Failed to revoke sessions before deletion", {
      userId: user.id,
      error: signOutError.message,
    });
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(
    user.id,
  );

  if (deleteError) {
    logger.error("Failed to delete user", {
      userId: user.id,
      error: deleteError.message,
    });
    return json({ error: "delete_failed" }, 500);
  }

  logger.info("User deleted", { userId: user.id });

  // public 側の関連データは **DB の外部キー（on delete cascade）で消すのが正**。
  // ここで個別に delete を並べると、テーブルが増えるたびに消し漏れが発生し、
  // 「アカウントは消えたのに投稿だけ残る」状態になる。
  // 派生プロジェクトでは drizzle スキーマ側で cascade を必ず設定すること。
  return json({ ok: true }, 200);
});
