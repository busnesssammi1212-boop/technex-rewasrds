# Technex Rewards — setup
1. Supabase: create a project, run `supabase/schema.sql` in the SQL editor. Auth > Providers: enable Email (and Google if wanted).
2. Edge Function: `supabase functions deploy postback --no-verify-jwt` then `supabase secrets set POSTBACK_SECRET=your-long-random-secret`.
3. Offerwall provider: set the postback URL to
   `https://YOUR-PROJECT.supabase.co/functions/v1/postback?user_id={user_id}&transaction_id={txn}&payout={payout}&secret=your-long-random-secret`
   (use the provider's own macro names; edit the param names in `index.ts` to match its docs).
4. Edit `public/config.js` (Supabase URL, anon key, offerwall URL). Never put the service role key in the frontend.
5. Sign up on the site, then in SQL: `update profiles set is_admin=true where email='YOUR_EMAIL';`
6. Push to GitHub, import into Vercel (output directory `public`).
Rewards are credited only by the postback after the partner confirms a completion. Users get `user_share` (default 25%) of the real payout; change it in Admin > Settings.
