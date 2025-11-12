"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter, usePathname } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { GraduationCap, BookOpen } from "lucide-react"
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
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [loadingRole, setLoadingRole] = useState(false)

  useEffect(() => {
    // Wait for user to be loaded
    if (!isLoaded) return
    
  // Only proceed if signed in
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

          // If there's an error fetching, don't force-redirect.
          // Instead, allow the user to choose a role so we can create/sync their profile.
          console.log("⚠️ Error fetching role — will show role selection modal to allow sync.");
        }

        // If userData exists and has role, redirect accordingly.
        if (userData && userData.role) {
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
          return
        }

        // If we reach here, user either has no DB record or no role -> show modal to pick one
        console.log("🟡 No role assigned for user, showing role selection modal")
        setShowRoleModal(true)
      } catch (error) {
        console.error("❌ Error in getUserRoleAndRedirect:", error)
        // Instead of forcing a redirect, allow user to pick role
        setShowRoleModal(true)
      }
    }

    getUserRoleAndRedirect()
  }, [isLoaded, isSignedIn, user, router, pathname, hasRedirected])

  const handleRoleSelect = async (role: "teacher" | "student") => {
    if (!user?.id) return
    setLoadingRole(true)
    try {
      const response = await fetch("/api/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          role,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Clear any pending localStorage flags
        if (typeof window !== "undefined") {
          localStorage.removeItem("pendingUserRole")
          localStorage.removeItem("pendingUserRoleTime")
          localStorage.setItem(`synced_${user.id}`, "true")
        }

        setShowRoleModal(false)
        setHasRedirected(true)
        // Redirect to appropriate dashboard
        if (role === "teacher") {
          router.push("/pages-Teacher/TeacherDashboard")
        } else {
          router.push("/pages-Student/StudentDashboard")
        }
      } else {
        console.error("Failed to sync user role:", data)
        alert("Could not save role. Please try again.")
      }
    } catch (err) {
      console.error("Error syncing role:", err)
      alert("Unexpected error while saving role. Please try again.")
    } finally {
      setLoadingRole(false)
    }
  }

  return (
    <>
      <AnimatePresence>
        {showRoleModal && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRoleModal(false)}
          >
            <motion.div
              className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-lg"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.08, type: "spring" }}
                  className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center"
                >
                  <GraduationCap className="w-8 h-8 text-white" />
                </motion.div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Choose Your Role</h2>
                <p className="text-sm md:text-base text-gray-500">Select how you'd like to join EduPortal</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <motion.div
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleRoleSelect("teacher")}
                  className="cursor-pointer flex flex-col items-center justify-center rounded-2xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-purple-100 p-6 sm:p-8 w-full transition-all duration-300 shadow-lg hover:shadow-xl group"
                >
                  <div className="w-16 h-16 mb-4 bg-purple-500 rounded-full flex items-center justify-center">
                    <GraduationCap className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-purple-700 mb-1">Teacher</h3>
                  <p className="text-xs text-purple-600 text-center">Create and manage courses</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleRoleSelect("student")}
                  className="cursor-pointer flex flex-col items-center justify-center rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100 p-6 sm:p-8 w-full transition-all duration-300 shadow-lg hover:shadow-xl group"
                >
                  <div className="w-16 h-16 mb-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-blue-700 mb-1">Student</h3>
                  <p className="text-xs text-blue-600 text-center">Learn and explore courses</p>
                </motion.div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                  disabled={loadingRole}
                >
                  Cancel
                </button>

                <div>
                  {loadingRole && <span className="text-sm text-gray-600">Saving...</span>}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}