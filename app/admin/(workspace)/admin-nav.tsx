"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Gift, LayoutDashboard, LogOut, Network, Settings, Users } from "lucide-react";
import { adminSignOut } from "../../actions/auth";

export const adminNavItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/referrals", label: "Referrals", icon: Network },
  { href: "/admin/rewards", label: "Rewards", icon: Gift },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-6" aria-label="Admin navigation">
      <p className="px-3 text-[11px] font-semibold uppercase text-white/40">Workspace</p>
      <div className="mt-3 space-y-1">
        {adminNavItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-11 items-center border-l-4 px-3 text-sm font-semibold transition-colors ${
                active
                  ? "border-[#ff4800] bg-white/10 text-white"
                  : "border-transparent text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon aria-hidden="true" className="mr-3 size-[18px] shrink-0" strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileAdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    if (open) {
      document.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="grid size-10 place-items-center border border-[#d8d8d2] bg-white text-black"
      >
        <span className="flex w-4 flex-col gap-1" aria-hidden="true">
          <span className="h-0.5 w-full bg-current" />
          <span className="h-0.5 w-full bg-current" />
          <span className="h-0.5 w-full bg-current" />
        </span>
      </button>

      <div
        className={`fixed inset-0 z-50 transition-visibility duration-300 lg:hidden ${
          open ? "visible pointer-events-auto" : "invisible pointer-events-none"
        }`}
        aria-hidden={!open}
      >
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
            className={`absolute inset-0 bg-black transition-opacity duration-300 ${
              open ? "opacity-40" : "opacity-0"
            }`}
          />
          <aside
            className={`relative flex h-full w-[min(82vw,300px)] flex-col bg-black text-white shadow-xl transition-transform duration-300 ease-out ${
              open ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex h-20 items-center justify-between border-b border-white/15 px-5">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center bg-[#ff4800] text-xs font-bold">SW8</span>
                <div>
                  <p className="text-sm font-semibold">SW8 Kitchen</p>
                  <p className="mt-0.5 text-xs text-white/50">Admin portal</p>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close navigation menu" className="relative grid size-9 place-items-center text-white/70 hover:text-white">
                <span className="absolute h-0.5 w-4 rotate-45 bg-current" />
                <span className="absolute h-0.5 w-4 -rotate-45 bg-current" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-6" aria-label="Mobile admin navigation">
              <p className="px-3 text-[11px] font-semibold uppercase text-white/40">Workspace</p>
              <div className="mt-3 space-y-1">
                {adminNavItems.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex h-11 items-center border-l-4 px-3 text-sm font-semibold ${active ? "border-[#ff4800] bg-white/10 text-white" : "border-transparent text-white/60"}`}><Icon aria-hidden="true" className="mr-3 size-[18px] shrink-0" strokeWidth={1.8} />{item.label}</Link>;
                })}
              </div>
            </nav>
            <div className="border-t border-white/15 p-4">
              <form action={adminSignOut}>
                <button
                  type="submit"
                  className="h-11 w-full border border-white/20 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <LogOut aria-hidden="true" className="mr-2 inline size-4 align-[-3px]" />
                  Sign out
                </button>
              </form>
            </div>
          </aside>
      </div>
    </>
  );
}
