"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

export default function AuthRedirector() {
  const { isSignedIn, user, isLoaded } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const [hasRedirected, setHasRedirected] = useState(false)

  useEffect(() => {
    // Wait for user to be loaded
    if (!isLoaded) return
    
    // Only redirect if signed in
    if (!isSignedIn || !user?.id) return

    // Prevent multiple redirects
    if (hasRedirected) return

    // Avoid redirecting from dashboard pages or auth pages
    const skipPaths = [
      "/TeacherDashboard",
      "/StudentDashboard", 
      "/sign-up", 
      "/sign-in",
      "/api"
    ]
    if (skipPaths.some((p) => pathname?.startsWith(p))) return

    const getUserRoleAndRedirect = async () => {
      try {
        // ALWAYS fetch from database as the source of truth
        const { data: userData, error } = await supabase
          .from("users")
          .select("role")
          .eq("clerk_id", user.id)
          .single()

        if (error) {
          console.error("❌ Error fetching user role from DB:", error)
          // If user doesn't exist in DB, default to student
          console.log("⚠️ User not found in DB, defaulting to student")
          setHasRedirected(true)
          router.push("/StudentDashboard")
          return
        }

        const role = userData?.role || "student"
        
        console.log("✅ Role fetched from database:", {
          clerkId: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          role: role
        })

        // Clear any stale localStorage data
        if (typeof window !== "undefined") {
          localStorage.removeItem("pendingUserRole")
          localStorage.removeItem("userRole")
        }

        // Redirect based on role from database
        setHasRedirected(true)
        
        if (role === "teacher") {
          console.log("👨‍🏫 Redirecting to Teacher Dashboard")
          router.push("/TeacherDashboard")
        } else {
          console.log("👨‍🎓 Redirecting to Student Dashboard")
          router.push("/StudentDashboard")
        }
      } catch (error) {
        console.error("❌ Error in getUserRoleAndRedirect:", error)
        // On error, default to student dashboard
        setHasRedirected(true)
        router.push("/StudentDashboard")
      }
    }

    getUserRoleAndRedirect()
  }, [isLoaded, isSignedIn, user, router, pathname, hasRedirected])

  return null
}