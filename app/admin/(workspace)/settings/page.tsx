import { AdminPageHeader } from "../admin-page-header";
import { createClient } from "@/lib/supabase/server";
import { AdminPasswordForm, AdminProfileForm } from "./settings-forms";

export default async function AdminSettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  const { updated } = await searchParams;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const { data: profile } = authData.user
    ? await supabase.from("admin_profiles").select("full_name, email, phone").eq("id", authData.user.id).maybeSingle()
    : { data: null };

  if (!profile) return null;

  return (
    <main className="px-5 py-7 sm:px-7 sm:py-9 xl:px-10">
      <div className="mx-auto max-w-[1000px]">
        <AdminPageHeader eyebrow="Settings" title="Administrator settings" description="Manage your profile and account security." />
        {updated ? <p role="status" className="mt-6 border-l-4 border-[#008d44] bg-[#e9f7ef] px-4 py-3 text-sm text-[#006b34]">{updated === "password" ? "Password updated successfully." : "Profile updated successfully."}</p> : null}
        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <section className="overflow-hidden rounded-lg border border-[#deded9] bg-white">
            <div className="border-b border-[#e5e5e0] px-5 py-4 sm:px-6"><h2 className="text-base font-semibold">Profile details</h2><p className="mt-1 text-xs text-[#777771]">Update the information shown in your admin workspace.</p></div>
            <div className="p-5 sm:p-6"><AdminProfileForm profile={profile} /></div>
          </section>
          <section className="overflow-hidden rounded-lg border border-[#deded9] bg-white">
            <div className="border-b border-[#e5e5e0] px-5 py-4 sm:px-6"><h2 className="text-base font-semibold">Password</h2><p className="mt-1 text-xs text-[#777771]">Confirm your current password before creating a new one.</p></div>
            <div className="p-5 sm:p-6"><AdminPasswordForm /></div>
          </section>
        </div>
      </div>
    </main>
  );
}
