import { getSupabaseClient } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { clerkId, email, role } = await req.json();

    console.log("🔔 Sync API called with:", { clerkId, email, role });

    if (!clerkId || !email || !role) {
      console.error("❌ Missing required fields");
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("📝 Checking if user exists in Supabase...");

    // ✅ Initialize supabase client properly
    const supabase = getSupabaseClient();

    // ✅ Check if user already exists
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("clerk_id", clerkId)
      .maybeSingle();

    if (fetchError) {
      console.error("❌ Error checking existing user:", fetchError);
    }

    if (existingUser) {
      console.log("ℹ️ User already exists in Supabase:", existingUser);
      return NextResponse.json({
        success: true,
        message: "User already exists",
        data: existingUser,
      });
    }

    console.log("➕ Inserting new user to Supabase...");

    // ✅ Insert new user
    const { data, error } = await supabase
      .from("users")
      .insert({
        clerk_id: clerkId,
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

    console.log("✅ User created successfully in Supabase:", data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("💥 Unexpected error in sync-user API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
