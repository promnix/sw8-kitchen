-- Run once in the Supabase SQL Editor after database.sql.
-- Atomically records a purchase and updates credit, loyalty, referrals, and rewards.

create or replace function public.record_customer_purchase(
  p_customer_id uuid,
  p_subtotal_amount bigint,
  p_credit_used_amount bigint default 0,
  p_change_left_amount bigint default 0,
  p_reward_id uuid default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_purchase_id uuid := gen_random_uuid();
  v_reference varchar(50);
  v_credit_balance bigint;
  v_reward public.rewards%rowtype;
  v_reward_discount bigint := 0;
  v_amount_paid bigint;
  v_loyalty_amount bigint;
  v_cycle public.loyalty_cycles%rowtype;
  v_referral public.referrals%rowtype;
  v_new_total bigint;
  v_new_reward_id uuid;
  v_loyalty_reward_unlocked boolean := false;
  v_referral_reward_unlocked boolean := false;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can record purchases';
  end if;

  if not exists (select 1 from public.customers where id = p_customer_id and status = 'active') then
    raise exception 'Customer does not exist or is not active';
  end if;

  if p_subtotal_amount <= 0 then
    raise exception 'Purchase amount must be greater than zero';
  end if;

  if p_credit_used_amount < 0 or p_change_left_amount < 0 then
    raise exception 'Credit values cannot be negative';
  end if;

  select coalesce(sum(
    case
      when transaction_type in ('deposit', 'adjustment_increase') then amount
      else -amount
    end
  ), 0)
  into v_credit_balance
  from public.credit_transactions
  where customer_id = p_customer_id;

  if p_credit_used_amount > v_credit_balance then
    raise exception 'Credit used exceeds the customer balance';
  end if;

  if p_reward_id is not null then
    select * into v_reward
    from public.rewards
    where id = p_reward_id
    for update;

    if not found or v_reward.customer_id <> p_customer_id or v_reward.status <> 'available' then
      raise exception 'The selected reward is not available for this customer';
    end if;

    v_reward_discount := least(v_reward.maximum_value, p_subtotal_amount);
  end if;

  if p_credit_used_amount > p_subtotal_amount - v_reward_discount then
    raise exception 'Credit used exceeds the remaining purchase amount';
  end if;

  v_amount_paid := p_subtotal_amount - v_reward_discount - p_credit_used_amount;
  v_loyalty_amount := p_subtotal_amount - v_reward_discount;
  v_reference := 'SW8-' || to_char(clock_timestamp(), 'YYMMDD') || '-' ||
    upper(substr(replace(v_purchase_id::text, '-', ''), 1, 8));

  insert into public.purchases (
    id,
    customer_id,
    recorded_by,
    reference,
    subtotal_amount,
    reward_discount_amount,
    credit_used_amount,
    amount_paid,
    loyalty_eligible_amount,
    notes
  ) values (
    v_purchase_id,
    p_customer_id,
    v_admin_id,
    v_reference,
    p_subtotal_amount,
    v_reward_discount,
    p_credit_used_amount,
    v_amount_paid,
    v_loyalty_amount,
    nullif(trim(p_notes), '')
  );

  if p_credit_used_amount > 0 then
    insert into public.credit_transactions (
      customer_id, purchase_id, recorded_by, transaction_type, amount, description
    ) values (
      p_customer_id, v_purchase_id, v_admin_id, 'redemption', p_credit_used_amount,
      'Customer credit used on purchase ' || v_reference
    );
  end if;

  if p_change_left_amount > 0 then
    insert into public.credit_transactions (
      customer_id, purchase_id, recorded_by, transaction_type, amount, description
    ) values (
      p_customer_id, v_purchase_id, v_admin_id, 'deposit', p_change_left_amount,
      'Change left after purchase ' || v_reference
    );
  end if;

  if p_reward_id is not null then
    insert into public.purchase_reward_redemptions (purchase_id, reward_id, redeemed_value)
    values (v_purchase_id, p_reward_id, v_reward_discount);

    update public.rewards
    set status = 'redeemed',
        redeemed_at = now(),
        redeemed_purchase_id = v_purchase_id,
        redeemed_by = v_admin_id
    where id = p_reward_id;

    if v_reward.source_loyalty_cycle_id is not null then
      update public.loyalty_cycles
      set status = 'reward_redeemed', completed_at = now()
      where id = v_reward.source_loyalty_cycle_id;

      insert into public.loyalty_cycles (
        customer_id, cycle_number, target_amount, accumulated_amount, status
      )
      select customer_id, cycle_number + 1, target_amount + 5000000, 0, 'progressing'
      from public.loyalty_cycles
      where id = v_reward.source_loyalty_cycle_id
      on conflict (customer_id, cycle_number) do nothing;
    end if;
  end if;

  select * into v_cycle
  from public.loyalty_cycles
  where customer_id = p_customer_id and status = 'progressing'
  order by cycle_number desc
  limit 1
  for update;

  if found then
    v_new_total := v_cycle.accumulated_amount + v_loyalty_amount;

    if v_new_total >= v_cycle.target_amount then
      update public.loyalty_cycles
      set accumulated_amount = v_new_total,
          status = 'reward_unlocked',
          qualified_at = now()
      where id = v_cycle.id;

      insert into public.rewards (
        customer_id, reward_type, maximum_value, source_loyalty_cycle_id, description
      ) values (
        p_customer_id, 'loyalty_meal', 500000, v_cycle.id,
        'Meal of the customer''s choice worth up to NGN 5,000'
      ) returning id into v_new_reward_id;

      v_loyalty_reward_unlocked := true;

      insert into public.notifications (
        customer_id, reward_id, recipient_type, recipient_email, subject, message, status
      )
      select p_customer_id, v_new_reward_id, 'customer', email,
        'Your SW8 Kitchen reward is ready',
        'You have unlocked a meal reward worth up to NGN 5,000.',
        case when email is null then 'skipped'::public.notification_status else 'pending'::public.notification_status end
      from public.customers where id = p_customer_id;

      insert into public.notifications (
        customer_id, reward_id, recipient_type, recipient_email, subject, message
      )
      select p_customer_id, v_new_reward_id, 'admin', email,
        'Customer loyalty reward unlocked',
        'A customer has unlocked a meal reward worth up to NGN 5,000.'
      from public.admin_profiles;
    else
      update public.loyalty_cycles
      set accumulated_amount = v_new_total
      where id = v_cycle.id;
    end if;
  end if;

  select * into v_referral
  from public.referrals
  where referred_customer_id = p_customer_id and status = 'progressing'
  limit 1
  for update;

  if found then
    v_new_total := v_referral.accumulated_amount + v_loyalty_amount;

    if v_new_total >= v_referral.qualifying_target_amount then
      update public.referrals
      set accumulated_amount = v_new_total,
          status = 'rewarded',
          qualified_at = now(),
          rewarded_at = now()
      where id = v_referral.id;

      insert into public.rewards (
        customer_id, reward_type, maximum_value, source_referral_id, description
      ) values (
        v_referral.referrer_customer_id, 'referral_side', 100000, v_referral.id,
        'Complimentary side worth up to NGN 1,000'
      ) returning id into v_new_reward_id;

      v_referral_reward_unlocked := true;

      insert into public.notifications (
        customer_id, reward_id, recipient_type, recipient_email, subject, message, status
      )
      select id, v_new_reward_id, 'customer', email,
        'Your referral reward is ready',
        'You have unlocked a complimentary side worth up to NGN 1,000.',
        case when email is null then 'skipped'::public.notification_status else 'pending'::public.notification_status end
      from public.customers where id = v_referral.referrer_customer_id;

      insert into public.notifications (
        customer_id, reward_id, recipient_type, recipient_email, subject, message
      )
      select v_referral.referrer_customer_id, v_new_reward_id, 'admin', email,
        'Customer referral reward unlocked',
        'A customer has unlocked a referral side reward worth up to NGN 1,000.'
      from public.admin_profiles;
    else
      update public.referrals
      set accumulated_amount = v_new_total
      where id = v_referral.id;
    end if;
  end if;

  insert into public.admin_audit_logs (
    admin_id, customer_id, action, entity_type, entity_id, new_data
  ) values (
    v_admin_id, p_customer_id, 'purchase_recorded', 'purchase', v_purchase_id,
    jsonb_build_object(
      'reference', v_reference,
      'subtotal_amount', p_subtotal_amount,
      'credit_used_amount', p_credit_used_amount,
      'change_left_amount', p_change_left_amount,
      'reward_discount_amount', v_reward_discount
    )
  );

  return jsonb_build_object(
    'purchase_id', v_purchase_id,
    'reference', v_reference,
    'loyalty_reward_unlocked', v_loyalty_reward_unlocked,
    'referral_reward_unlocked', v_referral_reward_unlocked
  );
end;
$$;

revoke all on function public.record_customer_purchase(uuid, bigint, bigint, bigint, uuid, text) from public;
grant execute on function public.record_customer_purchase(uuid, bigint, bigint, bigint, uuid, text) to authenticated;
