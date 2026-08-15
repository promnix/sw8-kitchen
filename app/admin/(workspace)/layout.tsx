import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { adminSignOut } from "../../actions/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav, MobileAdminNav } from "./admin-nav";

export default async function AdminWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/admin");
  }

  const { data: admin } = await supabase
    .from("admin_profiles")
    .select("full_name, email")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!admin) {
    await supabase.auth.signOut();
    redirect("/admin");
  }

  const initials = admin.full_name
    .split(" ")
    .map((name: string) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#f5f5f2] text-black">
      <aside className="fixed inset-y-0 left-0 hidden h-dvh w-[240px] border-r border-[#2b2b2b] bg-black text-white lg:flex lg:flex-col">
        <div className="flex h-20 items-center gap-3 border-b border-white/15 px-6">
          <div className="grid size-9 place-items-center bg-[#ff4800] text-xs font-bold">
            SW8
          </div>
          <div>
            <p className="text-sm font-semibold">SW8 Kitchen</p>
            <p className="mt-0.5 text-xs text-white/50">Admin portal</p>
          </div>
        </div>

        <AdminNav />

        <div className="border-t border-white/15 p-4">
          <div className="mb-4 flex items-center gap-3 px-2">
            <div className="grid size-9 shrink-0 place-items-center bg-[#008d44] text-xs font-bold">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{admin.full_name}</p>
              <p className="truncate text-xs text-white/45">{admin.email}</p>
            </div>
          </div>
          <form action={adminSignOut}>
            <button
              type="submit"
              className="h-10 w-full border border-white/20 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 pt-16 lg:ml-[240px] lg:pt-0">
        <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-[#deded9] bg-white px-5 sm:px-7 lg:hidden">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center bg-[#ff4800] text-[11px] font-bold text-white">SW8</span>
            <span className="text-sm font-semibold">Admin portal</span>
          </Link>
          <MobileAdminNav />
        </header>
        {children}
      </div>
    </div>
  );
}
