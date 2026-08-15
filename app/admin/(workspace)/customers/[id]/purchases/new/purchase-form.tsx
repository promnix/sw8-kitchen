"use client";

import { useActionState, useMemo, useState } from "react";
import { recordPurchase, type RecordPurchaseState } from "./actions";

type RewardOption = {
  id: string;
  label: string;
  maximumValue: number;
};

export function PurchaseForm({
  customerId,
  creditBalance,
  rewards,
}: {
  customerId: string;
  creditBalance: number;
  rewards: RewardOption[];
}) {
  const action = recordPurchase.bind(null, customerId);
  const [state, formAction, pending] = useActionState<RecordPurchaseState, FormData>(action, {
    error: "",
  });
  const [subtotal, setSubtotal] = useState("");
  const [creditUsed, setCreditUsed] = useState("0");
  const [changeLeft, setChangeLeft] = useState("0");
  const [rewardId, setRewardId] = useState("");
  const [notes, setNotes] = useState("");

  const selectedReward = rewards.find((reward) => reward.id === rewardId);
  const calculation = useMemo(() => {
    const subtotalKobo = Math.max(0, Number(subtotal.replace(/,/g, "")) || 0) * 100;
    const creditKobo = Math.max(0, Number(creditUsed.replace(/,/g, "")) || 0) * 100;
    const rewardDiscount = Math.min(selectedReward?.maximumValue ?? 0, subtotalKobo);
    return Math.max(0, subtotalKobo - rewardDiscount - creditKobo);
  }, [creditUsed, selectedReward, subtotal]);

  return (
    <form action={formAction} className="space-y-7">
      <section className="border border-[#deded9] bg-white">
        <div className="border-b border-[#e5e5e0] px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold">Purchase details</h2>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <MoneyField label="Purchase total" name="subtotal" value={subtotal} onChange={setSubtotal} required />
          <MoneyField
            label="Customer credit used"
            name="creditUsed"
            value={creditUsed}
            onChange={setCreditUsed}
            note={`Available: ${formatNaira(creditBalance)}`}
          />
          <MoneyField
            label="Change left behind"
            name="changeLeft"
            value={changeLeft}
            onChange={setChangeLeft}
            note="Added to the customer's credit balance"
          />
          <label>
            <span className="mb-2 block text-sm font-medium text-[#282825]">Reward to redeem</span>
            <select
              name="rewardId"
              value={rewardId}
              onChange={(event) => setRewardId(event.target.value)}
              className="h-12 w-full border border-[#c9c9c3] bg-white px-4 text-base text-black outline-none focus:border-[#ff4800] focus:ring-2 focus:ring-[#ff4800]/15"
            >
              <option value="">No reward</option>
              {rewards.map((reward) => (
                <option key={reward.id} value={reward.id}>
                  {reward.label} - up to {formatNaira(reward.maximumValue)}
                </option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-medium text-[#282825]">Notes</span>
            <textarea
              name="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="w-full resize-y border border-[#c9c9c3] bg-white px-4 py-3 text-base text-black outline-none focus:border-[#ff4800] focus:ring-2 focus:ring-[#ff4800]/15"
            />
          </label>
        </div>
      </section>

      <section className="border border-[#deded9] bg-[#fafaf8] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-5">
          <div>
            <p className="text-sm font-medium text-[#686864]">Amount customer pays</p>
            <p className="mt-1 text-xs text-[#8a8a84]">After selected reward and customer credit</p>
          </div>
          <p className="text-2xl font-semibold text-black">{formatNaira(calculation)}</p>
        </div>
      </section>

      {state.error ? (
        <p role="alert" className="border-l-4 border-[#ff4800] bg-[#fff1eb] px-4 py-3 text-sm text-[#7c2b0c]">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="h-12 bg-[#ff4800] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#df3e00] disabled:cursor-wait disabled:bg-[#bd5f39]"
      >
        {pending ? "Recording purchase..." : "Record purchase"}
      </button>
    </form>
  );
}

function MoneyField({
  label,
  name,
  value,
  onChange,
  note,
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  note?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-[#282825]">{label}</span>
      <div className="flex h-12 border border-[#c9c9c3] bg-white focus-within:border-[#ff4800] focus-within:ring-2 focus-within:ring-[#ff4800]/15">
        <span className="grid w-12 shrink-0 place-items-center border-r border-[#deded9] text-sm font-semibold text-[#686864]">NGN</span>
        <input
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
          required={required}
          className="min-w-0 flex-1 px-3 text-base text-black outline-none"
        />
      </div>
      {note ? <span className="mt-1.5 block text-xs text-[#777771]">{note}</span> : null}
    </label>
  );
}

function formatNaira(kobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}
