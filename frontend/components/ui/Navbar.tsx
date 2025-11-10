"use client";
import * as React from "react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, GraduationCap, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useClerk,
  useUser,
} from "@clerk/nextjs";

const Navbar = () => {
  
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<
    "teacher" | "student" | null
  >(null);
  const { openSignUp } = useClerk();
  const { user } = useUser();

  const toggleMenu = () => setIsOpen(!isOpen);

  // Handle role selection and open Clerk signup with role in metadata
  const handleRoleSelect = async (role: "teacher" | "student") => {
    console.log("🎯 Role selected:", role);
    setSelectedRole(role);
    // Store role in localStorage with timestamp to ensure it's fresh
    localStorage.setItem("pendingUserRole", role);
    localStorage.setItem("pendingUserRoleTime", Date.now().toString());
    console.log("💾 Stored in localStorage:", {
      role,
      time: Date.now(),
      verification: localStorage.getItem("pendingUserRole"),
    });
    setShowRoleModal(false);

    // Open Clerk sign-up modal
    console.log("🚀 Opening Clerk signup...");
    openSignUp();
  };

  // Log user info when they sign in and sync to Supabase
  useEffect(() => {
    const syncNewUser = async () => {
      console.log("🔍 useEffect triggered, user:", user ? "exists" : "null");

      if (user) {
        const pendingRole = localStorage.getItem("pendingUserRole");
        const roleTime = localStorage.getItem("pendingUserRoleTime");
        const hasSynced = localStorage.getItem(`synced_${user.id}`);

        console.log("📦 localStorage check:", {
          pendingRole,
          roleTime,
          hasSynced,
        });

        // Skip if already synced
        if (hasSynced) {
          console.log("✓ User already synced, skipping");
          return;
        }

        // Check if there's a pending role and it's recent (within last 5 minutes)
        if (pendingRole && roleTime) {
          const timeDiff = Date.now() - parseInt(roleTime);
          console.log("⏱️ Time difference:", timeDiff, "ms");

          if (timeDiff < 5 * 60 * 1000) {
            // 5 minutes
            console.log("🔄 New user detected, calling sync API...");
            console.log("📤 Sending data:", {
              clerkId: user.id,
              email: user.primaryEmailAddress?.emailAddress,
              role: pendingRole,
            });

            try {
              const response = await fetch("/api/sync-user", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  clerkId: user.id,
                  email: user.primaryEmailAddress?.emailAddress,
                  role: pendingRole,
                }),
              });

              console.log("📥 Response status:", response.status);
              const data = await response.json();
              console.log("📥 Response data:", data);

              if (data.success) {
                console.log("✅ User synced to Supabase:", data);
                // Mark as synced and clear pending role
                localStorage.setItem(`synced_${user.id}`, "true");
                localStorage.removeItem("pendingUserRole");
                localStorage.removeItem("pendingUserRoleTime");

                // 🔹 Redirect based on role
                if (pendingRole === "teacher") {
                  router.push("/frontend/app/pages/Teacher/Dashboard");
                } else if (pendingRole === "student") {
                  router.push("/frontend/app/pages/Student/Dashboard");
                }
              } else {
                console.error("❌ Failed to sync user:", data.error);
              }
            } catch (error) {
              console.error("💥 Error syncing user:", error);
            }
          } else {
            console.log("⏰ Role selection too old, skipping sync");
          }
        } else {
          console.log("ℹ️ No pending role found in localStorage");
        }

        console.log("✅ User logged in:", {
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          role: pendingRole || "not set",
        });
      }
    };

    syncNewUser();
  }, [user]);

  return (
    <>
      <div className="sticky top-0 z-50 flex justify-center w-full py-6 px-4 bg-transparent backdrop-blur-md">
        <div className="flex items-center justify-between px-6 py-3 md:px-10 lg:px-12 bg-white/90 rounded-full shadow-lg w-full max-w-6xl relative z-10">
          {/* Logo */}
          <div className="flex items-center">
            <motion.div
              className="w-8 h-8 mr-6"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              whileHover={{ rotate: 10 }}
              transition={{ duration: 0.3 }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="16" cy="16" r="16" fill="url(#paint0_linear)" />
                <defs>
                  <linearGradient
                    id="paint0_linear"
                    x1="0"
                    y1="0"
                    x2="32"
                    y2="32"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#C084FC" />
                    <stop offset="1" stopColor="#7C3AED" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>
            <h1 className="text-lg md:text-xl font-bold text-gray-800">
              EduPortal
            </h1>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-10 lg:space-x-12">
            {["Home", "Pricing", "Docs", "Projects"].map((item) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{ scale: 1.05 }}
              >
                <a
                  href="#"
                  className="text-sm text-gray-900 hover:text-gray-600 transition-colors font-medium"
                >
                  {item}
                </a>
              </motion.div>
            ))}
          </nav>

          {/* Auth Buttons - Desktop */}
          <motion.div
            className="hidden md:flex md:items-center md:space-x-4 md:ml-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <SignedOut>
              <SignInButton mode="modal">
                <button className="inline-flex items-center justify-center rounded-full border border-purple-600 px-5 py-2.5 text-sm font-semibold text-purple-600 hover:bg-blue-50 transition-all duration-200">
                  Sign In
                </button>
              </SignInButton>

              <button
                onClick={() => setShowRoleModal(true)}
                className="inline-flex items-center justify-center rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 transition-all duration-200"
              >
                Join Us
              </button>
            </SignedOut>

            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </motion.div>

          {/* Mobile Menu Button */}
          <motion.button
            aria-label={isOpen ? "Close menu" : "Open menu"}
            className="md:hidden flex items-center ml-2 p-2 rounded-full hover:bg-gray-100"
            onClick={toggleMenu}
            whileTap={{ scale: 0.96 }}
          >
            {isOpen ? (
              <X className="h-6 w-6 text-gray-900" />
            ) : (
              <Menu className="h-6 w-6 text-gray-900" />
            )}
          </motion.button>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="absolute top-full left-4 right-4 mt-2 bg-white rounded-2xl shadow-2xl overflow-hidden md:hidden z-50"
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-6 space-y-4">
                {/* Mobile Nav Links */}
                {["Home", "Pricing", "Docs", "Projects"].map((item, index) => (
                  <motion.a
                    key={item}
                    href="#"
                    className="block py-3 px-4 text-gray-900 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors font-medium"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setIsOpen(false)}
                  >
                    {item}
                  </motion.a>
                ))}

                {/* Mobile Auth Buttons */}
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <SignedOut>
                    <SignInButton mode="modal">
                      <button
                        className="w-full py-3 px-4 text-center rounded-full border border-purple-600 text-purple-600 hover:bg-purple-50 transition-all duration-200 font-semibold"
                        onClick={() => setIsOpen(false)}
                      >
                        Sign In
                      </button>
                    </SignInButton>

                    <button
                      onClick={() => {
                        setShowRoleModal(true);
                        setIsOpen(false);
                      }}
                      className="w-full py-3 px-4 text-center rounded-full bg-purple-600 text-white hover:bg-purple-500 transition-all duration-200 font-semibold"
                    >
                      Join Us
                    </button>
                  </SignedOut>

                  <SignedIn>
                    <div className="flex justify-center py-2">
                      <UserButton afterSignOutUrl="/" />
                    </div>
                  </SignedIn>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Role Selection Modal */}
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
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring" }}
                  className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center"
                >
                  <GraduationCap className="w-8 h-8 text-white" />
                </motion.div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                  Choose Your Role
                </h2>
                <p className="text-sm md:text-base text-gray-500">
                  Select how you'd like to join EduPortal
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                {/* Teacher Card */}
                <motion.div
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleRoleSelect("teacher")}
                  className="cursor-pointer flex flex-col items-center justify-center rounded-2xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 p-6 sm:p-8 w-full transition-all duration-300 shadow-lg hover:shadow-xl group"
                >
                  <div className="w-16 h-16 mb-4 bg-purple-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <GraduationCap className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-purple-700 mb-1">
                    Teacher
                  </h3>
                  <p className="text-xs text-purple-600 text-center">
                    Create and manage courses
                  </p>
                </motion.div>

                {/* Student Card */}
                <motion.div
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleRoleSelect("student")}
                  className="cursor-pointer flex flex-col items-center justify-center rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 p-6 sm:p-8 w-full transition-all duration-300 shadow-lg hover:shadow-xl group"
                >
                  <div className="w-16 h-16 mb-4 bg-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-blue-700 mb-1">
                    Student
                  </h3>
                  <p className="text-xs text-blue-600 text-center">
                    Learn and explore courses
                  </p>
                </motion.div>
              </div>

              <button
                onClick={() => setShowRoleModal(false)}
                className="w-full text-sm text-gray-500 hover:text-gray-700 underline transition-colors py-2"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export { Navbar };
