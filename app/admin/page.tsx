import Image from "next/image";
import { SignInForm } from "../sign-in-form";

export default function AdminSignInPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f5] lg:grid lg:grid-cols-[minmax(320px,0.82fr)_1.18fr]">
      <section className="flex min-h-[250px] flex-col justify-between bg-black px-6 py-7 text-white sm:px-10 sm:py-9 lg:min-h-screen lg:px-14 lg:py-12">
        <div className="flex items-center gap-3">
          <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-white p-1">
            <Image src="/brand/sw8-logo.png" alt="SW8 Kitchen" width={48} height={36} className="h-auto w-full" priority />
          </div>
          <div>
            <p className="text-lg font-semibold leading-none">SW8 Kitchen</p>
            <p className="mt-1 text-xs text-white/60">Admin portal</p>
          </div>
        </div>

        <div className="max-w-md pb-1 pt-14 lg:pb-8">
          <p className="mb-4 text-xs font-semibold uppercase text-[#ffb132]">
            Administration
          </p>
          <h1 className="max-w-sm text-3xl font-semibold leading-tight sm:text-4xl lg:text-[44px]">
            Sign in to manage your kitchen.
          </h1>
          <div className="mt-7 flex items-center gap-2" aria-hidden="true">
            <span className="h-1 w-14 bg-[#ff4800]" />
            <span className="h-1 w-7 bg-[#ffb132]" />
            <span className="h-1 w-4 bg-[#008d44]" />
          </div>
        </div>

        <p className="hidden text-xs text-white/50 lg:block">SW8 Kitchen admin portal</p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-[430px]">
          <div className="mb-8">
            <p className="text-sm font-semibold text-[#008d44]">Admin access</p>
            <h2 className="mt-2 text-3xl font-semibold text-black">Sign in</h2>
            <p className="mt-2 text-sm leading-6 text-[#686864]">
              Use your administrator account details to continue.
            </p>
          </div>

          <SignInForm accountType="admin" />
        </div>
      </section>
    </main>
  );
}
