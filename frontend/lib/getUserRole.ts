// lib/getUserRole.ts
import { currentUser } from "@clerk/nextjs/server"
import { supabase } from "./supabaseClient"

export type UserRole = "admin" | "student" | null

export async function getUserRole(): Promise<UserRole> {
  const user = await currentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("clerk_id", user.id)
    .single()

  if (error || !data) return null
  return data.role as UserRole
}
