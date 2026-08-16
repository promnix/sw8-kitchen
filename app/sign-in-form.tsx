"use client";

import { useActionState } from "react";
import {
  adminSignIn,
  customerSignIn,
  type SignInState,
} from "./actions/auth";

type AccountType = "customer" | "admin";

type SignInFormProps = {
  accountType: AccountType;
};

export function SignInForm({ accountType }: SignInFormProps) {
  const isCustomer = accountType === "customer";
  const action = isCustomer ? customerSignIn : adminSignIn;
  const initialState: SignInState = { error: "" };
  const [state, formAction, pending] = useActionState(action, initialState);
  const hasError = Boolean(state.error);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="identifier" className="mb-2 block text-sm font-medium text-[#282825]">
          {isCustomer ? "Phone number" : "Email address"}
        </label>
        <input
          id="identifier"
          name="identifier"
          type={isCustomer ? "tel" : "email"}
          inputMode={isCustomer ? "numeric" : "email"}
          autoComplete={isCustomer ? "tel" : "email"}
          placeholder={isCustomer ? "0705 814 9297" : "admin@sw8kitchen.com"}
          required
          aria-invalid={hasError}
          aria-describedby={hasError ? "sign-in-error" : undefined}
          className={`h-12 w-full rounded-md border bg-white px-4 text-base text-black outline-none transition placeholder:text-[#a5a59f] focus:ring-2 focus:ring-[#ff4800]/15 ${hasError ? "border-[#d52f1f] focus:border-[#d52f1f]" : "border-[#c9c9c3] focus:border-[#ff4800]"}`}
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#282825]">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
          aria-invalid={hasError}
          aria-describedby={hasError ? "sign-in-error" : undefined}
          className={`h-12 w-full rounded-md border bg-white px-4 text-base text-black outline-none transition placeholder:text-[#a5a59f] focus:ring-2 focus:ring-[#ff4800]/15 ${hasError ? "border-[#d52f1f] focus:border-[#d52f1f]" : "border-[#c9c9c3] focus:border-[#ff4800]"}`}
        />
      </div>

      {state.error ? (
        <span id="sign-in-error" role="alert" className="block text-sm font-medium text-[#d52f1f]">
          {state.error}
        </span>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full bg-[#ff4800] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#df3e00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4800] disabled:cursor-wait disabled:bg-[#bd5f39]"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
