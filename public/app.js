const db = supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
const $ = (s) => document.querySelector(s), app = $("#app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const m$ = (n) => "$" + Number(n || 0).toFixed(2);
let me = null, st = {};
async function load() {
  const { data: { session } } = await db.auth.getSession();
  me = null;
  if (session) { const { data } = await db.from("profiles").select("*").eq("id", session.user.id).single(); me = data; }
  const { data: s } = await db.from("settings").select("*"); st = Object.fromEntries((s || []).map(r => [r.key, r.value]));
}
function nav() {
  const l = me ? [["dash","ড্যাশবোর্ড"],["ads","বিজ্ঞাপন"],["offers","অফারওয়াল"],["wallet","ওয়ালেট"],["withdraw","উইথড্র"],["profile","প্রোফাইল"]].concat(me.is_admin ? [["admin","অ্যাডমিন"]] : [])
    : [["home","হোম"],["login","লগইন"],["about","আমাদের সম্পর্কে"],["contact","যোগাযোগ"]];
  $("#nav").innerHTML = `<b>TECHNEX REWARDS</b>` + l.map(([h, t]) => `<a href="#${h}">${t}</a>`).join("") + (me ? `<a href="#" id="out">লগআউট</a>` : "");
  const o = $("#out"); if (o) o.onclick = async (e) => { e.preventDefault(); await db.auth.signOut(); location.hash = "home"; route(); };
}
const guard = () => { if (!me) { location.hash = "login"; return false; } if (me.banned) { app.innerHTML = "<div class=card>আপনার অ্যাকাউন্ট ব্যান করা হয়েছে।</div>"; return false; } return true; };
const P = {
  home: () => `<h1>ঘরে বসে আয় করুন</h1><p class=mu>অফার সম্পূর্ণ করুন, ওয়ালেটে টাকা জমান, bKash / Nagad / Rocket / USDT-এ তুলুন।</p><a class=btn href="#login">শুরু করুন</a>
   <div class=card><b>কিভাবে কাজ করে</b><p class=mu>পুরস্কার শুধু তখনই যোগ হয় যখন বিজ্ঞাপন পার্টনার সম্পূর্ণ কাজ যাচাই করে নিশ্চিত করে। আয় নির্ভর করে অফারের ওপর, কোনো নির্দিষ্ট পরিমাণের নিশ্চয়তা নেই।</p></div>`,
  login: () => `<h1>লগইন / রেজিস্টার</h1><div class=card><input id=e type=email placeholder="ইমেইল"><input id=p type=password placeholder="পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)">
   <button id=li>লগইন</button> <button class=alt id=su>রেজিস্টার</button> <button class=alt id=gg>Google দিয়ে</button><p class=msg id=m></p></div>`,
  about: () => `<h1>আমাদের সম্পর্কে</h1><div class=card>Technex Rewards একটি রিওয়ার্ড প্ল্যাটফর্ম। Developer: Yakub Ansari</div>`,
  contact: () => `<h1>যোগাযোগ</h1><div class=card>ইমেইল: ayubsammi6@gmail.com<br>ঠিকানা: চট্টগ্রাম</div>`,
  terms: () => `<h1>শর্তাবলী</h1><div class=card>একজন ব্যক্তির একটি অ্যাকাউন্ট। ভুয়া কাজ, VPN/বট বা একাধিক অ্যাকাউন্ট ধরা পড়লে ব্যালেন্স বাতিল ও অ্যাকাউন্ট ব্যান হবে। পেমেন্ট অ্যাডমিন যাচাইয়ের পর দেওয়া হয়।</div>`,
  privacy: () => `<h1>গোপনীয়তা নীতি</h1><div class=card>আমরা শুধু ইমেইল ও উইথড্র নম্বর সংরক্ষণ করি। তৃতীয় পক্ষকে বিক্রি করা হয় না।</div>`,
  dash: async () => { const { data: t } = await db.from("transactions").select("id").eq("user_id", me.id);
   return `<h1>ড্যাশবোর্ড</h1><div class=grid><div class=card>ব্যালেন্স<div class=big>${m$(me.balance)}</div></div><div class=card>মোট আয়<div class=big>${m$(me.total_earned)}</div></div><div class=card>লেনদেন<div class=big>${t?.length || 0}</div></div></div>
   <div class=card><b>ডেইলি বোনাস (${m$(st.daily_bonus)})</b><br><button id=bn>বোনাস নিন</button> <span class=msg id=m></span></div>`; },
  ads: () => `<h1>বিজ্ঞাপন দেখুন</h1><div class=card>রিওয়ার্ডেড বিজ্ঞাপন শিগগিরই। বিজ্ঞাপন নেটওয়ার্ক অনুমোদন হলে এখানে যুক্ত হবে এবং সার্ভার-সাইড যাচাইয়ের পর পুরস্কার যোগ হবে।</div>`,
  offers: async () => { const { data } = await db.from("offers").select("*").eq("active", true);
   const url = CFG.OFFERWALL_URL.replace("{USER_ID}", me.id);
   return `<h1>অফারওয়াল</h1><a class=btn href="${esc(url)}" target="_blank" rel="noopener">অফারওয়াল খুলুন</a>` + (data || []).map(o => `<div class=card><b>${esc(o.title)}</b><p class=mu>${esc(o.description)}</p>${m$(o.reward)} <a href="${esc(o.url)}" target="_blank" rel="noopener">যান</a></div>`).join(""); },
  wallet: async () => { const { data } = await db.from("transactions").select("*").eq("user_id", me.id).order("id", { ascending: false }).limit(100);
   return `<h1>ওয়ালেট ও ইতিহাস</h1><div class=card>ব্যালেন্স<div class=big>${m$(me.balance)}</div></div><div class="card wrap"><table><tr><th>তারিখ<th>ধরন<th>পরিমাণ</tr>${(data || []).map(t => `<tr><td>${new Date(t.created_at).toLocaleString()}<td>${esc(t.type)}<td>${m$(t.amount)}</tr>`).join("")}</table></div>`; },
  withdraw: async () => { const { data } = await db.from("withdrawals").select("*").eq("user_id", me.id).order("id", { ascending: false });
   return `<h1>উইথড্র</h1><div class=card>সর্বনিম্ন ${m$(st.min_withdraw)}<select id=md><option>bKash<option>Nagad<option>Rocket<option>USDT-BEP20</select><input id=ac placeholder="নম্বর / ওয়ালেট ঠিকানা"><input id=am type=number step=0.01 placeholder="পরিমাণ ($)"><button id=wd>অনুরোধ পাঠান</button><p class=msg id=m></p></div>
   <div class="card wrap"><table><tr><th>পদ্ধতি<th>পরিমাণ<th>স্ট্যাটাস<th>TxID</tr>${(data || []).map(w => `<tr><td>${esc(w.method)}<td>${m$(w.amount)}<td>${esc(w.status)}<td>${esc(w.txn_id)}</tr>`).join("")}</table></div>`; },
  profile: () => `<h1>প্রোফাইল</h1><div class=card>${esc(me.email)}<p class=mu>পাসওয়ার্ড বদলাতে:</p><input id=np type=password placeholder="নতুন পাসওয়ার্ড"><button id=cp>বদলান</button> <span class=msg id=m></span><p><a href="#terms">শর্তাবলী</a> · <a href="#privacy">গোপনীয়তা</a></p></div>`,
  admin: async () => { if (!me.is_admin) return "<div class=card>অনুমতি নেই</div>";
   const [u, w, o] = await Promise.all([db.from("profiles").select("*").order("created_at", { ascending: false }).limit(100), db.from("withdrawals").select("*").eq("status", "pending"), db.from("offers").select("*")]);
   const sum = (u.data || []).reduce((a, x) => a + +x.balance, 0);
   return `<h1>অ্যাডমিন</h1><div class=grid><div class=card>ইউজার<div class=big>${u.data?.length || 0}</div></div><div class=card>ইউজারদের ব্যালেন্স<div class=big>${m$(sum)}</div></div><div class=card>পেন্ডিং উইথড্র<div class=big>${w.data?.length || 0}</div></div></div>
   <div class="card wrap"><b>উইথড্র</b><table>${(w.data || []).map(x => `<tr><td>${esc(x.method)}<td>${esc(x.account)}<td>${m$(x.amount)}<td><input id=tx${x.id} placeholder="TxID"><td><button data-ok=${x.id}>Approve</button> <button class=alt data-no=${x.id}>Reject</button></tr>`).join("")}</table></div>
   <div class=card><b>অফার যোগ করুন</b><input id=ot placeholder="Title"><input id=od placeholder="Description"><input id=ou placeholder="URL"><input id=or type=number step=0.01 placeholder="Reward $"><button id=ao>Add</button></div>
   <div class="card wrap"><b>অফার</b><table>${(o.data || []).map(x => `<tr><td>${esc(x.title)}<td>${m$(x.reward)}<td><button class=alt data-del=${x.id}>Delete</button></tr>`).join("")}</table></div>
   <div class="card wrap"><b>ইউজার</b><table>${(u.data || []).map(x => `<tr><td>${esc(x.email)}<td>${m$(x.balance)}<td><button class=alt data-ban=${x.id} data-v=${!x.banned}>${x.banned ? "Unban" : "Ban"}</button></tr>`).join("")}</table></div>
   <div class=card><b>সেটিংস</b>${Object.entries(st).map(([k, v]) => `<input data-k=${k} value="${esc(v)}" title="${k}">`).join("")}<button id=ss>Save</button></div>`; }
};
const say = (t) => { const m = $("#m"); if (m) m.textContent = t; };
function bind() {
  const c = (s, f) => { const e = $(s); if (e) e.onclick = f; };
  c("#li", async () => { const { error } = await db.auth.signInWithPassword({ email: $("#e").value, password: $("#p").value }); error ? say(error.message) : (location.hash = "dash", route()); });
  c("#su", async () => { const { error } = await db.auth.signUp({ email: $("#e").value, password: $("#p").value }); say(error ? error.message : "রেজিস্টার হয়েছে। এখন লগইন করুন (ইমেইল কনফার্ম লাগতে পারে)।"); });
  c("#gg", () => db.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin } }));
  c("#bn", async () => { const { data, error } = await db.rpc("claim_bonus"); say(error ? error.message : data); await load(); });
  c("#wd", async () => { const { data, error } = await db.rpc("request_withdraw", { m: $("#md").value, acc: $("#ac").value, amt: +$("#am").value }); say(error ? error.message : data); await load(); });
  c("#cp", async () => { const { error } = await db.auth.updateUser({ password: $("#np").value }); say(error ? error.message : "পাসওয়ার্ড বদলেছে"); });
  c("#ao", async () => { await db.from("offers").insert({ title: $("#ot").value, description: $("#od").value, url: $("#ou").value, reward: +$("#or").value }); route(); });
  c("#ss", async () => { for (const i of document.querySelectorAll("[data-k]")) await db.from("settings").update({ value: i.value }).eq("key", i.dataset.k); route(); });
  document.querySelectorAll("[data-ok]").forEach(b => b.onclick = async () => { await db.rpc("admin_withdraw", { wid: +b.dataset.ok, ok: true, tx: $("#tx" + b.dataset.ok).value }); route(); });
  document.querySelectorAll("[data-no]").forEach(b => b.onclick = async () => { await db.rpc("admin_withdraw", { wid: +b.dataset.no, ok: false, tx: "" }); route(); });
  document.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => { await db.from("offers").delete().eq("id", b.dataset.del); route(); });
  document.querySelectorAll("[data-ban]").forEach(b => b.onclick = async () => { await db.from("profiles").update({ banned: b.dataset.v === "true" }).eq("id", b.dataset.ban); route(); });
}
async function route() {
  const r = location.hash.slice(1) || "home"; await load(); nav();
  const open = ["home", "login", "about", "contact", "terms", "privacy"];
  if (!open.includes(r) && !guard()) return;
  if (r === "login" && me) { location.hash = "dash"; return; }
  app.innerHTML = await (P[r] || P.home)(); bind();
}
addEventListener("hashchange", route); route();
