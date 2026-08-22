import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (req.method !== "POST") {
      return json({ error: "طريقة غير مدعومة" }, 405);
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" }, 400);
    }
    if (password.length < 6) {
      return json({ error: "كلمة المرور يجب أن تكون ٦ أحرف على الأقل" }, 400);
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if email already exists
    const { data: existing } = await adminClient
      .from("users")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existing) {
      return json({ error: "هذا البريد الإلكتروني مستخدم بالفعل" }, 400);
    }

    // Create auth user with mandoub role
    const { data: authData, error: createErr } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: { role: "mandoub" },
    });

    if (createErr) {
      return json({ error: createErr.message }, 400);
    }

    // Insert into users table with mandoub role
    const { error: insertErr } = await adminClient
      .from("users")
      .insert({
        id: authData.user.id,
        email: cleanEmail,
        role: "mandoub",
      });

    if (insertErr) {
      await adminClient.auth.admin.deleteUserById(authData.user.id);
      return json({ error: insertErr.message }, 500);
    }

    // Create default permissions (all false — admin will set later)
    await adminClient.from("mandoub_permissions").insert({
      user_id: authData.user.id,
      can_add_products: false,
      can_view_data: false,
      can_change_order_status: false,
    });

    return json({ success: true, id: authData.user.id, email: cleanEmail }, 200);
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : "خطأ غير متوقع" },
      500
    );
  }

  function json(data: unknown, status: number) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
