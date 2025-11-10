// middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function middleware(req: NextRequest) {
  const { userId } = auth()
  const url = req.nextUrl.clone()

  if (!userId) {
    url.pathname = "/sign-in"
    return NextResponse.redirect(url)
  }

  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("clerk_id", userId)
    .single()

  if (data?.role === "teacher") {
    url.pathname = "/teacher"
  } else {
    url.pathname = "/student"
  }

  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/dashboard"],
}
