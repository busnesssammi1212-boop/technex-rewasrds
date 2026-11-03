-- Run in Supabase SQL editor
create table settings(key text primary key, value text not null);
insert into settings values('min_withdraw','5'),('daily_bonus','0.05'),('user_share','0.25'),('ad_reward','0.01'),('site_name','Technex Rewards');

create table profiles(
 id uuid primary key references auth.users on delete cascade,
 email text, balance numeric(12,4) not null default 0, total_earned numeric(12,4) not null default 0,
 is_admin boolean not null default false, banned boolean not null default false,
 last_bonus date, created_at timestamptz default now());

create table offers(id bigserial primary key, title text, description text, url text, reward numeric(10,4) not null default 0.1, active boolean default true, created_at timestamptz default now());
create table transactions(id bigserial primary key, user_id uuid references profiles on delete cascade, type text, amount numeric(12,4), ref text unique, note text, created_at timestamptz default now());
create table withdrawals(id bigserial primary key, user_id uuid references profiles on delete cascade, method text check (method in ('bKash','Nagad','Rocket','USDT-BEP20')), account text, amount numeric(12,4), status text default 'pending', txn_id text, created_at timestamptz default now());
create table audit_logs(id bigserial primary key, admin_id uuid, action text, detail text, created_at timestamptz default now());

create or replace function is_admin() returns boolean language sql security definer as
$$ select coalesce((select is_admin from profiles where id=auth.uid()),false) $$;

create or replace function handle_new_user() returns trigger language plpgsql security definer as
$$ begin insert into profiles(id,email) values(new.id,new.email); return new; end $$;
create trigger on_signup after insert on auth.users for each row execute function handle_new_user();

alter table profiles enable row level security; alter table offers enable row level security;
alter table transactions enable row level security; alter table withdrawals enable row level security;
alter table settings enable row level security; alter table audit_logs enable row level security;

create policy p_self on profiles for select using(id=auth.uid() or is_admin());
create policy p_adm on profiles for update using(is_admin());
create policy o_read on offers for select using(active or is_admin());
create policy o_adm on offers for all using(is_admin());
create policy t_read on transactions for select using(user_id=auth.uid() or is_admin());
create policy w_read on withdrawals for select using(user_id=auth.uid() or is_admin());
create policy w_adm on withdrawals for update using(is_admin());
create policy s_read on settings for select using(true);
create policy s_adm on settings for all using(is_admin());
create policy a_adm on audit_logs for all using(is_admin());
-- Users have no insert/update policy on balances: only the functions below change money.

create or replace function claim_bonus() returns text language plpgsql security definer as $$
declare b numeric; p profiles;
begin select * into p from profiles where id=auth.uid() for update;
 if p.banned then return 'Account banned'; end if;
 if p.last_bonus = current_date then return 'Already claimed today'; end if;
 select value::numeric into b from settings where key='daily_bonus';
 update profiles set balance=balance+b,total_earned=total_earned+b,last_bonus=current_date where id=p.id;
 insert into transactions(user_id,type,amount,note) values(p.id,'bonus',b,'Daily bonus');
 return 'Bonus added: $'||b; end $$;

create or replace function request_withdraw(m text, acc text, amt numeric) returns text language plpgsql security definer as $$
declare p profiles; mn numeric;
begin select * into p from profiles where id=auth.uid() for update;
 select value::numeric into mn from settings where key='min_withdraw';
 if p.banned then return 'Account banned'; end if;
 if amt < mn then return 'Minimum withdrawal is $'||mn; end if;
 if amt > p.balance then return 'Not enough balance'; end if;
 update profiles set balance=balance-amt where id=p.id;
 insert into withdrawals(user_id,method,account,amount) values(p.id,m,acc,amt);
 insert into transactions(user_id,type,amount,note) values(p.id,'withdraw',-amt,m||' request');
 return 'Withdrawal requested'; end $$;

create or replace function admin_withdraw(wid bigint, ok boolean, tx text) returns void language plpgsql security definer as $$
declare w withdrawals;
begin if not is_admin() then raise exception 'no'; end if;
 select * into w from withdrawals where id=wid and status='pending' for update;
 if not found then return; end if;
 if ok then update withdrawals set status='approved',txn_id=tx where id=wid;
 else update withdrawals set status='rejected' where id=wid;
  update profiles set balance=balance+w.amount where id=w.user_id;
  insert into transactions(user_id,type,amount,note) values(w.user_id,'refund',w.amount,'Withdrawal rejected'); end if;
 insert into audit_logs(admin_id,action,detail) values(auth.uid(),case when ok then 'approve' else 'reject' end,'withdrawal '||wid||' '||coalesce(tx,''));
end $$;

-- Called only by the postback Edge Function (service role)
create or replace function credit_offer(uid uuid, amt numeric, txn text) returns boolean language plpgsql security definer as $$
begin insert into transactions(user_id,type,amount,ref,note) values(uid,'offer',amt,txn,'Offerwall');
 update profiles set balance=balance+amt,total_earned=total_earned+amt where id=uid and not banned;
 return true; exception when unique_violation then return false; end $$;
revoke execute on function credit_offer from public, anon, authenticated;
-- After signing up, make yourself admin: update profiles set is_admin=true where email='YOUR_EMAIL';
