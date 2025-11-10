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
      "/pages-Teacher/TeacherDashboard",
      "/pages-Student/StudentDashboard", 
      "/sign-up", 
      "/sign-in",
      "/api"
    ]
    
    // Check if current path should be skipped
    if (skipPaths.some((p) => pathname?.startsWith(p))) {
      console.log("⏭️ Skipping redirect, already on dashboard:", pathname)
      return
    }

    const getUserRoleAndRedirect = async () => {
      try {
        console.log("🔍 Fetching user role for:", user.id)
        
        // ALWAYS fetch from database as the source of truth
        const { data: userData, error } = await supabase
          .from("users")
          .select("role")
          .eq("clerk_id", user.id)
          .single()

        if (error) {
          // Improve error logging with more context
          console.error("❌ Error fetching user role from DB:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            userId: user.id
          });
          
          // Redirect to home page if we can't fetch user data
          console.log("🏠 Redirecting to home page due to data fetch error");
          setHasRedirected(true);
          router.push("/");
          return;
        }

        if (!userData) {
          console.log("⚠️ No user data found in database");
          setHasRedirected(true);
          router.push("/");
          return;
        }

        const role = userData.role
        
        console.log("✅ Role fetched from database:", {
          clerkId: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          role: role,
          currentPath: pathname
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
          router.push("/pages-Teacher/TeacherDashboard")
        } else {
          console.log("👨‍🎓 Redirecting to Student Dashboard")
          router.push("/pages-Student/StudentDashboard")
        }
      } catch (error) {
        console.error("❌ Error in getUserRoleAndRedirect:", error)
        // On error, default to student dashboard
        setHasRedirected(true)
        router.push("/pages-Student/StudentDashboard")
      }
    }

    getUserRoleAndRedirect()
  }, [isLoaded, isSignedIn, user, router, pathname, hasRedirected])

  return null
}