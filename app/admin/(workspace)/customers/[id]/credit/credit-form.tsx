"use client";

import { useActionState, useState } from "react";
import { adjustCredit, type CreditAdjustmentState } from "./actions";

export function CreditForm({ customerId, balance }: { customerId: string; balance: number }) {
  const action = adjustCredit.bind(null, customerId);
  const [state, formAction, pending] = useActionState<CreditAdjustmentState, FormData>(action, { error: "" });
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState("increase");
  const [description, setDescription] = useState("");

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label><span className="mb-2 block text-sm font-medium">Adjustment type</span><select name="direction" value={direction} onChange={(e) => setDirection(e.target.value)} className="h-12 w-full border border-[#c9c9c3] bg-white px-4 outline-none focus:border-[#ff4800]"><option value="increase">Add credit</option><option value="decrease">Remove credit</option></select></label>
        <label><span className="mb-2 block text-sm font-medium">Amount</span><div className="flex h-12 border border-[#c9c9c3] focus-within:border-[#ff4800]"><span className="grid w-12 place-items-center border-r border-[#deded9] text-sm font-semibold text-[#686864]">NGN</span><input name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="min-w-0 flex-1 px-3 outline-none" /></div></label>
        <label className="sm:col-span-2"><span className="mb-2 block text-sm font-medium">Reason</span><textarea name="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Why is this credit being adjusted?" className="w-full border border-[#c9c9c3] px-4 py-3 outline-none focus:border-[#ff4800]" /></label>
      </div>
      <p className="text-sm text-[#686864]">Current available credit: <strong className="text-black">{formatNaira(balance)}</strong></p>
      {state.error ? <p role="alert" className="border-l-4 border-[#ff4800] bg-[#fff1eb] px-4 py-3 text-sm text-[#7c2b0c]">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="h-12 bg-[#ff4800] px-6 text-sm font-semibold text-white disabled:bg-[#bd5f39]">{pending ? "Saving adjustment..." : "Save adjustment"}</button>
    </form>
  );
}

function formatNaira(kobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100);
}
