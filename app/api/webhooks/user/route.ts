import { getSupabaseClient } from "@/lib/supabaseClient";
import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

type ClerkWebhookEvent = {
  type: string;
  data: {
    id: string;
    email_addresses: { email_address: string }[];
    unsafe_metadata?: { role?: string };
    public_metadata?: { role?: string };
  };
};

export async function POST(req: Request) {
  try {
    const payload = await req.text();

    // ✅ FIX: await headers()
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id") as string;
    const svix_timestamp = headerPayload.get("svix-timestamp") as string;
    const svix_signature = headerPayload.get("svix-signature") as string;

    if (!process.env.CLERK_WEBHOOK_SECRET) {
      console.error("❌ CLERK_WEBHOOK_SECRET is not set");
      return NextResponse.json(
        { success: false, error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
    let event: ClerkWebhookEvent;

    try {
      event = wh.verify(payload, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as ClerkWebhookEvent;
    } catch (err) {
      console.error("❌ Invalid webhook signature", err);
      return new Response("Invalid signature", { status: 400 });
    }

    console.log("🔔 Webhook received:", event.type);

    if (event.type !== "user.created") {
      console.log(`ℹ️ Ignoring event type: ${event.type}`);
      return NextResponse.json({ success: true, message: "Event ignored" });
    }

    const { id, email_addresses, unsafe_metadata, public_metadata } = event.data;
    const email = email_addresses[0]?.email_address;

    // Default role to 'student'
    const role = unsafe_metadata?.role || public_metadata?.role || "student";

    console.log("📝 User data from webhook:", { clerk_id: id, email, role });

    // ✅ FIX: call getSupabaseClient()
    const supabase = getSupabaseClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("clerk_id", id)
      .maybeSingle();

    if (existingUser) {
      console.log("ℹ️ User already exists in Supabase (likely created by sync-user API)");
      return NextResponse.json({ success: true, message: "User already exists" });
    }

    // Insert new user as fallback
    const { data, error } = await supabase
      .from("users")
      .insert({
        clerk_id: id,
        email,
        role,
      })
      .select();

    if (error) {
      console.error("❌ Supabase insert error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log("✅ User created successfully in Supabase via webhook:", data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("💥 Unexpected error in Clerk webhook:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
