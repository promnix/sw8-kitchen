"use client";

import { LoaderCircle, LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";

export function LogoutButton({ className = "" }: { className?: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className} transition-all duration-200 disabled:cursor-wait disabled:opacity-75`}
    >
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          Signing out...
        </>
      ) : (
        <>
          <LogOut aria-hidden="true" className="size-4" />
          Sign out
        </>
      )}
    </button>
  );
}
