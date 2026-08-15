"use client";

import { FormEvent, useState } from "react";

type AccountType = "customer" | "admin";

export function SignInForm() {
  const [accountType, setAccountType] = useState<AccountType>("customer");
  const [message, setMessage] = useState("");

  function selectAccountType(type: AccountType) {
    setAccountType(type);
    setMessage("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Authentication will be connected in the next build step.");
  }

  const isCustomer = accountType === "customer";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div
        className="grid grid-cols-2 border border-[#d5d5cf] bg-[#ecece8] p-1"
        aria-label="Account type"
      >
        <button
          type="button"
          onClick={() => selectAccountType("customer")}
          className={`h-10 text-sm font-semibold transition-colors ${
            isCustomer
              ? "bg-white text-black shadow-sm"
              : "text-[#666660] hover:text-black"
          }`}
          aria-pressed={isCustomer}
        >
          Customer
        </button>
        <button
          type="button"
          onClick={() => selectAccountType("admin")}
          className={`h-10 text-sm font-semibold transition-colors ${
            !isCustomer
              ? "bg-white text-black shadow-sm"
              : "text-[#666660] hover:text-black"
          }`}
          aria-pressed={!isCustomer}
        >
          Admin
        </button>
      </div>

      <div>
        <label htmlFor="identifier" className="mb-2 block text-sm font-medium text-[#282825]">
          {isCustomer ? "Phone number" : "Email address"}
        </label>
        <input
          key={accountType}
          id="identifier"
          name="identifier"
          type={isCustomer ? "tel" : "email"}
          inputMode={isCustomer ? "numeric" : "email"}
          autoComplete={isCustomer ? "tel" : "email"}
          placeholder={isCustomer ? "0705 814 9297" : "admin@sw8kitchen.com"}
          required
          className="h-12 w-full border border-[#c9c9c3] bg-white px-4 text-base text-black outline-none transition placeholder:text-[#a5a59f] focus:border-[#ff4800] focus:ring-2 focus:ring-[#ff4800]/15"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#282825]">
          {isCustomer ? "Surname" : "Password"}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder={isCustomer ? "Enter your surname" : "Enter your password"}
          required
          className="h-12 w-full border border-[#c9c9c3] bg-white px-4 text-base text-black outline-none transition placeholder:text-[#a5a59f] focus:border-[#ff4800] focus:ring-2 focus:ring-[#ff4800]/15"
        />
      </div>

      {message ? (
        <p role="status" className="border-l-4 border-[#ffb132] bg-[#fff8e8] px-4 py-3 text-sm text-[#5e4a17]">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        className="h-12 w-full bg-[#ff4800] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#df3e00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4800]"
      >
        Sign in
      </button>
    </form>
  );
}
