// supabase functions deploy postback --no-verify-jwt
// Secret: POSTBACK_SECRET (put the same value in your offerwall provider's postback URL)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async (req) => {
  const u = new URL(req.url).searchParams;
  const uid = u.get("user_id"), txn = u.get("transaction_id"), payout = parseFloat(u.get("payout") ?? "0");
  if (u.get("secret") !== Deno.env.get("POSTBACK_SECRET")) return new Response("forbidden", { status: 403 });
  if (!uid || !txn || !(payout > 0)) return new Response("bad request", { status: 400 });
  // ADJUST param names / signature check to match your provider's docs.
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: s } = await db.from("settings").select("value").eq("key", "user_share").single();
  const reward = +(payout * parseFloat(s?.value ?? "0.25")).toFixed(4); // user gets a share of the real partner payout
  const { data, error } = await db.rpc("credit_offer", { uid, amt: reward, txn });
  if (error) return new Response("error", { status: 500 });
  return new Response(data ? "1" : "duplicate");
});
