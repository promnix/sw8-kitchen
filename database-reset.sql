-- WARNING: Destructive development reset.
-- Run only in the intended Supabase project. This removes all application data
-- but leaves auth.users intact; run `npm run seed:test` afterward to restore
-- the local admin and test customer profiles.

begin;

truncate table
  public.admin_audit_logs,
  public.notifications,
  public.purchase_reward_redemptions,
  public.rewards,
  public.referrals,
  public.loyalty_cycles,
  public.credit_transactions,
  public.purchases,
  public.customers,
  public.admin_profiles
restart identity cascade;

commit;
