import { Hono } from "hono/mod.ts";
import { Context } from "hono/mod.ts";
import { Database } from "../domain/entity/__generated__/schema.ts";
import { createClient } from "@supabase/supabase-js";

console.log("Hello from Hono Functions!");

const supabaseClient = createClient<Database>(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? ""
);

const app = new Hono();

app.get("/", async (c: Context) => {
  const query = await supabaseClient
    .from("general_users")
    .select("name")
    .limit(1);
  console.log(query.data);
  const generalUser = query.data?.[0];
  const data = {
    message: `Hello ${generalUser?.name ?? "World"}!`,
  };

  return c.json(data);
});

app.post("/", async (c: Context) => {
  const body = await c.req.json();
  const data = {
    message: `Hello ${body.name ?? "World"}!`,
    receivedData: body,
  };

  return c.json(data);
});

Deno.serve(app.fetch);
