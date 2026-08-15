-- Supabase / PostgreSQL database schema for SW8 Kitchen.
-- Run this file in the Supabase SQL Editor on a new project.
-- Monetary values are stored in kobo: NGN 5,000 = 500000 kobo.

create extension if not exists pgcrypto;

create type public.customer_status as enum ('active', 'inactive', 'suspended');
create type public.purchase_status as enum ('completed', 'voided');
create type public.credit_transaction_type as enum (
  'deposit',
  'redemption',
  'adjustment_increase',
  'adjustment_decrease'
);
create type public.loyalty_cycle_status as enum (
  'progressing',
  'reward_unlocked',
  'reward_redeemed',
  'cancelled'
);
create type public.reward_type as enum ('loyalty_meal', 'referral_side');
create type public.reward_status as enum ('available', 'redeemed', 'expired', 'cancelled');
create type public.referral_status as enum ('progressing', 'qualified', 'rewarded', 'cancelled');
create type public.notification_recipient as enum ('customer', 'admin');
create type public.notification_status as enum ('pending', 'sent', 'failed', 'skipped');

-- Every profile ID is the matching user ID in Supabase Auth (auth.users).
-- Create Auth users from a trusted server endpoint using the Supabase service-role key.
create table public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name varchar(150) not null,
  email varchar(255) not null unique,
  phone varchar(20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key references auth.users(id) on delete cascade,
  phone varchar(11) not null unique check (phone ~ '^0[0-9]{10}$'),
  first_name varchar(100) not null,
  surname varchar(100) not null,
  other_names varchar(150),
  address text not null,
  date_of_birth date check (date_of_birth is null or date_of_birth <= current_date),
  email varchar(255),
  referral_code varchar(20) not null unique,
  status public.customer_status not null default 'active',
  created_by uuid not null references public.admin_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  recorded_by uuid not null references public.admin_profiles(id),
  reference varchar(50) not null unique,
  subtotal_amount bigint not null check (subtotal_amount >= 0),
  reward_discount_amount bigint not null default 0 check (reward_discount_amount >= 0),
  credit_used_amount bigint not null default 0 check (credit_used_amount >= 0),
  amount_paid bigint not null check (amount_paid >= 0),
  loyalty_eligible_amount bigint not null check (loyalty_eligible_amount >= 0),
  purchased_at timestamptz not null default now(),
  status public.purchase_status not null default 'completed',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reward_discount_amount + credit_used_amount + amount_paid = subtotal_amount),
  check (loyalty_eligible_amount <= subtotal_amount)
);

-- This ledger is the source of truth for intentionally left customer change.
-- Calculate a customer's current balance from this table; do not store a mutable balance column.
create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  purchase_id uuid references public.purchases(id),
  recorded_by uuid not null references public.admin_profiles(id),
  transaction_type public.credit_transaction_type not null,
  amount bigint not null check (amount > 0),
  description varchar(255),
  created_at timestamptz not null default now()
);

create table public.loyalty_cycles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  cycle_number integer not null check (cycle_number > 0),
  target_amount bigint not null check (target_amount > 0),
  accumulated_amount bigint not null default 0 check (accumulated_amount >= 0),
  status public.loyalty_cycle_status not null default 'progressing',
  started_at timestamptz not null default now(),
  qualified_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, cycle_number)
);

-- A referred customer can have one referrer, while a referrer can refer many customers.
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_customer_id uuid not null references public.customers(id),
  referred_customer_id uuid not null unique references public.customers(id),
  referral_code_used varchar(20) not null,
  qualifying_target_amount bigint not null default 5000000 check (qualifying_target_amount > 0),
  accumulated_amount bigint not null default 0 check (accumulated_amount >= 0),
  status public.referral_status not null default 'progressing',
  registered_by uuid not null references public.admin_profiles(id),
  qualified_at timestamptz,
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (referrer_customer_id <> referred_customer_id)
);

-- A reward comes from exactly one loyalty cycle or one referral.
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  reward_type public.reward_type not null,
  status public.reward_status not null default 'available',
  maximum_value bigint not null check (maximum_value > 0),
  source_loyalty_cycle_id uuid unique references public.loyalty_cycles(id),
  source_referral_id uuid unique references public.referrals(id),
  unlocked_at timestamptz not null default now(),
  redeemed_at timestamptz,
  redeemed_purchase_id uuid references public.purchases(id),
  redeemed_by uuid references public.admin_profiles(id),
  expires_at timestamptz,
  description varchar(255),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(source_loyalty_cycle_id, source_referral_id) = 1),
  check (
    (reward_type = 'loyalty_meal' and source_loyalty_cycle_id is not null)
    or (reward_type = 'referral_side' and source_referral_id is not null)
  )
);

create table public.purchase_reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id),
  reward_id uuid not null unique references public.rewards(id),
  redeemed_value bigint not null check (redeemed_value > 0),
  created_at timestamptz not null default now()
);

-- This is an email outbox. An Edge Function or trusted server job sends pending messages.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id),
  reward_id uuid references public.rewards(id),
  recipient_type public.notification_recipient not null,
  recipient_email varchar(255),
  subject varchar(255) not null,
  message text not null,
  status public.notification_status not null default 'pending',
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admin_profiles(id),
  customer_id uuid references public.customers(id),
  action varchar(100) not null,
  entity_type varchar(50) not null,
  entity_id uuid,
  previous_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index purchases_customer_purchased_at_idx on public.purchases (customer_id, purchased_at desc);
create index credit_transactions_customer_created_at_idx on public.credit_transactions (customer_id, created_at desc);
create index loyalty_cycles_customer_status_idx on public.loyalty_cycles (customer_id, status);
create index referrals_referrer_status_idx on public.referrals (referrer_customer_id, status);
create index rewards_customer_status_idx on public.rewards (customer_id, status);
create index purchase_reward_redemptions_purchase_idx on public.purchase_reward_redemptions (purchase_id);
create index notifications_status_idx on public.notifications (status);
create index admin_audit_logs_entity_idx on public.admin_audit_logs (entity_type, entity_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger admin_profiles_set_updated_at
before update on public.admin_profiles
for each row execute function public.set_updated_at();

create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create trigger purchases_set_updated_at
before update on public.purchases
for each row execute function public.set_updated_at();

create trigger loyalty_cycles_set_updated_at
before update on public.loyalty_cycles
for each row execute function public.set_updated_at();

create trigger referrals_set_updated_at
before update on public.referrals
for each row execute function public.set_updated_at();

create trigger rewards_set_updated_at
before update on public.rewards
for each row execute function public.set_updated_at();

create trigger notifications_set_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

-- The server-side admin check is reused by all Row Level Security policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to authenticated;

alter table public.admin_profiles enable row level security;
alter table public.customers enable row level security;
alter table public.purchases enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.loyalty_cycles enable row level security;
alter table public.referrals enable row level security;
alter table public.rewards enable row level security;
alter table public.purchase_reward_redemptions enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_audit_logs enable row level security;

create policy "Admins can manage admin profiles"
on public.admin_profiles for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Customers can view their own admin-safe profile"
on public.customers for select to authenticated
using (id = auth.uid() or public.is_admin());

create policy "Admins can manage customers"
on public.customers for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Customers can view their own purchases"
on public.purchases for select to authenticated
using (customer_id = auth.uid() or public.is_admin());

create policy "Admins can manage purchases"
on public.purchases for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Customers can view their own credit ledger"
on public.credit_transactions for select to authenticated
using (customer_id = auth.uid() or public.is_admin());

create policy "Admins can manage credit transactions"
on public.credit_transactions for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Customers can view their own loyalty cycles"
on public.loyalty_cycles for select to authenticated
using (customer_id = auth.uid() or public.is_admin());

create policy "Admins can manage loyalty cycles"
on public.loyalty_cycles for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Customers can view their own referrals"
on public.referrals for select to authenticated
using (
  referrer_customer_id = auth.uid()
  or referred_customer_id = auth.uid()
  or public.is_admin()
);

create policy "Admins can manage referrals"
on public.referrals for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Customers can view their own rewards"
on public.rewards for select to authenticated
using (customer_id = auth.uid() or public.is_admin());

create policy "Admins can manage rewards"
on public.rewards for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Customers can view their own reward redemptions"
on public.purchase_reward_redemptions for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.rewards
    where rewards.id = reward_id and rewards.customer_id = auth.uid()
  )
);

create policy "Admins can manage reward redemptions"
on public.purchase_reward_redemptions for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Customers can view their own notifications"
on public.notifications for select to authenticated
using (customer_id = auth.uid() or public.is_admin());

create policy "Admins can manage notifications"
on public.notifications for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Admins can manage audit logs"
on public.admin_audit_logs for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Initial loyalty-cycle values, for use by the application when an admin creates a customer:
-- cycle_number: 1
-- target_amount: 15000000  (NGN 150,000)
-- accumulated_amount: 0
--
-- When a loyalty meal reward is redeemed, create the next cycle with:
-- cycle_number: previous cycle_number + 1
-- target_amount: previous target_amount + 5000000  (add NGN 50,000)
--
-- Customer-facing queries should exclude loyalty_cycles.target_amount so reward thresholds remain private.
