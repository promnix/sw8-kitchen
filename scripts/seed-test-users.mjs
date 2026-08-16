import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.",
  );
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const adminCredentials = {
  email: "sw8kitchen@gmail.com",
  password: "Admin@12345",
};

const customerCredentials = {
  phone: "07058149298",
  surname: "Edwin",
  authEmail: "07058149298@customers.sw8.local",
  referralCode: "SW8-7058149298",
};

async function findAuthUser(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.find((user) => user.email === email) ?? null;
}

async function ensureAuthUser({ email, password, metadata }) {
  const existingUser = await findAuthUser(email);

  if (existingUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw error;
  return data.user;
}

const adminUser = await ensureAuthUser({
  email: adminCredentials.email,
  password: adminCredentials.password,
  metadata: { role: "admin", full_name: "SW8 Test Admin" },
});

const { error: adminProfileError } = await supabase.from("admin_profiles").upsert(
  {
    id: adminUser.id,
    full_name: "SW8 Test Admin",
    email: adminCredentials.email,
    phone: "08000000000",
  },
  { onConflict: "id" },
);
if (adminProfileError) throw adminProfileError;

const customerUser = await ensureAuthUser({
  email: customerCredentials.authEmail,
  password: customerCredentials.surname,
  metadata: {
    role: "customer",
    first_name: "Test",
    surname: customerCredentials.surname,
    phone: customerCredentials.phone,
  },
});

const { error: customerError } = await supabase.from("customers").upsert(
  {
    id: customerUser.id,
    phone: customerCredentials.phone,
    first_name: "Test",
    surname: customerCredentials.surname,
    other_names: "Customer",
    address: "12 Test Street, Lagos",
    email: "customer@sw8kitchen.test",
    referral_code: customerCredentials.referralCode,
    status: "active",
    created_by: adminUser.id,
  },
  { onConflict: "id" },
);
if (customerError) throw customerError;

const { error: cycleError } = await supabase.from("loyalty_cycles").upsert(
  {
    customer_id: customerUser.id,
    cycle_number: 1,
    target_amount: 15000000,
    accumulated_amount: 0,
    status: "progressing",
  },
  { onConflict: "customer_id,cycle_number" },
);
if (cycleError) throw cycleError;

console.log("Test accounts are ready:");
console.log(`Admin:    ${adminCredentials.email} / ${adminCredentials.password}`);
console.log(`Customer: ${customerCredentials.phone} / ${customerCredentials.surname}`);
console.log(`Referral code: ${customerCredentials.referralCode}`);
