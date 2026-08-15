import { createClient } from "@/lib/supabase/server";

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

export async function getAuthenticatedAdmin() {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) return { supabase, user: null, admin: null };

  const { data: admin } = await supabase
    .from("admin_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, admin };
}
