import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the caller is authenticated and is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "غير مصرح" }, 401);
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return json({ error: "غير مصرح" }, 401);
    }

    const { data: callerProfile } = await adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (callerProfile?.role !== "admin") {
      return json({ error: "هذه العملية تتطلب صلاحيات المدير" }, 403);
    }

    const method = req.method;
    const url = new URL(req.url);

    // GET: list all staff (admin + mandoub) with profiles and permissions
    if (method === "GET") {
      const { data: staff, error } = await adminClient
        .from("users")
        .select("id, email, role, created_at")
        .in("role", ["admin", "mandoub"])
        .order("created_at", { ascending: true });
      if (error) return json({ error: error.message }, 500);

      // Fetch mandoub profiles and permissions for all mandoub users
      const mandoubIds = (staff || []).filter((s) => s.role === "mandoub").map((s) => s.id);
      let profiles: Record<string, any> = {};
      let perms: Record<string, any> = {};

      if (mandoubIds.length > 0) {
        const [{ data: profileData }, { data: permData }] = await Promise.all([
          adminClient.from("mandoub_profiles").select("*").in("user_id", mandoubIds),
          adminClient.from("mandoub_permissions").select("*").in("user_id", mandoubIds),
        ]);
        for (const p of profileData || []) {
          profiles[p.user_id] = p;
        }
        for (const p of permData || []) {
          perms[p.user_id] = p;
        }
      }

      const enriched = (staff || []).map((s) => ({
        ...s,
        full_name: profiles[s.id]?.full_name || null,
        telegram_link: profiles[s.id]?.telegram_link || null,
        photo_url: profiles[s.id]?.photo_url || null,
        specialty_tags: profiles[s.id]?.specialty_tags || [],
        onboarding_complete: profiles[s.id]?.onboarding_complete || false,
        permissions: perms[s.id] || null,
      }));

      return json({ staff: enriched }, 200);
    }

    // POST: create a new mandoub account (admin creates, mandoub sets own password later)
    if (method === "POST") {
      const body = await req.json();
      const { email, password, role } = body;

      if (!email || !password) {
        return json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" }, 400);
      }
      if (password.length < 6) {
        return json({ error: "كلمة المرور يجب أن تكون ٦ أحرف على الأقل" }, 400);
      }
      const targetRole = role === "admin" ? "admin" : "mandoub";

      const { data: authData, error: createErr } = await adminClient.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { role: targetRole },
      });

      if (createErr) {
        return json({ error: createErr.message }, 400);
      }

      const { error: insertErr } = await adminClient
        .from("users")
        .insert({
          id: authData.user.id,
          email: email.trim().toLowerCase(),
          role: targetRole,
        });

      if (insertErr) {
        await adminClient.auth.admin.deleteUserById(authData.user.id);
        return json({ error: insertErr.message }, 500);
      }

      // If mandoub, create default permissions (all false)
      if (targetRole === "mandoub") {
        await adminClient.from("mandoub_permissions").insert({
          user_id: authData.user.id,
          can_add_products: false,
          can_view_data: false,
          can_change_order_status: false,
        });
      }

      return json({ success: true, id: authData.user.id }, 200);
    }

    // DELETE: remove a staff account
    if (method === "DELETE") {
      const body = await req.json().catch(() => ({}));
      const userId = body.id || url.searchParams.get("id");
      if (!userId) return json({ error: "معرف المستخدم مطلوب" }, 400);
      if (userId === user.id) {
        return json({ error: "لا يمكنك حذف حسابك الحالي" }, 400);
      }

      const { data: target } = await adminClient
        .from("users")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      if (!target || !["admin", "mandoub"].includes(target.role)) {
        return json({ error: "المستخدم غير موجود أو ليس من الموظفين" }, 404);
      }

      await adminClient.from("users").delete().eq("id", userId);
      const { error: delErr } = await adminClient.auth.admin.deleteUserById(userId);
      if (delErr) {
        return json({ error: delErr.message }, 500);
      }

      return json({ success: true }, 200);
    }

    return json({ error: "طريقة غير مدعومة" }, 405);
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
