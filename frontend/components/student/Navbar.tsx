"use client";

import React, { useEffect, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import {
  LayoutDashboard,
  BookOpen,
  Award,
  TrendingUp,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  User,
  History,
} from "lucide-react";

interface NavItem {
  name: string;
  icon: any;
  path: string;
  badge?: number;
}

interface UserData {
  id: string;
  clerk_id: string;
  email: string;
  role: string;
  created_at: string;
}

type Props = {
  isCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  onMobileToggle?: (open?: boolean) => void;
};

export default function StudentNavbar({
  isCollapsed = false,
  onCollapseChange = () => {},
  mobileOpen = false,
  onMobileToggle = () => {},
}: Props) {
  const { signOut } = useClerk();
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = getSupabaseClient();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("clerk_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching user data:", error);
          return;
        }

        setUserData(data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user?.id, supabase]);

  const navigationItems: NavItem[] = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/pages-Student/StudentDashboard",
    },
    {
      name: "Available Quizzes",
      icon: BookOpen,
      path: "/pages-Student/AvailableQuiz",
    },
    {
      name: "My Results",
      icon: History,
      path: "/pages-Student/Result",
    },
    {
      name: "Leaderboard",
      icon: Award,
      path: "/pages-Student/Leaderboard",
    },
    {
      name: "Progress",
      icon: TrendingUp,
      path: "/pages-Student/Progress",
    },
    {
      name: "Profile",
      icon: User,
      path: "/pages-Student/Profile",
    },
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
    if (mobileOpen) onMobileToggle(false);
  };

  const handleLogout = async () => {
    await signOut({ redirectUrl: "/" });
  };

  const getUserInitial = () => {
    if (user?.firstName) return user.firstName.charAt(0);
    if (userData?.email) return userData.email.charAt(0).toUpperCase();
    if (user?.emailAddresses[0]?.emailAddress)
      return user.emailAddresses[0].emailAddress.charAt(0).toUpperCase();
    return "S";
  };

  const getUserName = () => {
    if (user?.firstName) return user.firstName;
    if (userData?.email) return userData.email.split("@")[0];
    return "Student";
  };

  const getUserEmail = () => {
    if (userData?.email) return userData.email;
    if (user?.emailAddresses[0]?.emailAddress)
      return user.emailAddresses[0].emailAddress;
    return "";
  };

  return (
    <>
      {/* backdrop for mobile */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 md:hidden ${
          mobileOpen ? "block" : "hidden"
        }`}
        onClick={() => onMobileToggle(false)}
      />

      <div
        className={`${
          isCollapsed ? "w-20" : "w-64"
        } min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-cyan-900 text-white transition-all duration-300 ease-in-out flex flex-col fixed left-0 top-0 shadow-2xl z-50 transform ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Logo/Brand Section */}
        <div className="p-6 border-b border-blue-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                <GraduationCap className="w-8 h-8 text-blue-300" />
              </div>
              {!isCollapsed && (
                <div>
                  <h1 className="text-xl font-bold">EduPortal</h1>
                  <p className="text-xs text-blue-300">Student Portal</p>
                </div>
              )}
            </div>
            <button
              onClick={() => onCollapseChange(!isCollapsed)}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={`${
                isCollapsed ? "hidden" : "hidden md:inline-flex"
              } p-2 hover:bg-white/10 rounded-lg transition-colors`}
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Floating expand button when collapsed */}
        {isCollapsed && (
          <button
            onClick={() => onCollapseChange(false)}
            aria-label="Expand sidebar"
            className="hidden md:flex absolute -right-3 top-6 z-50 w-7 h-7 bg-white/95 text-blue-900 rounded-full items-center justify-center shadow-lg border border-gray-200"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* User Profile Section */}
        {!isCollapsed && (
          <div className="p-4 border-b border-blue-700/50">
            <div className="flex items-center space-x-3 bg-white/5 p-3 rounded-lg backdrop-blur-sm">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 flex items-center justify-center text-white font-bold text-lg">
                {getUserInitial()}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-semibold text-sm truncate">
                  {getUserName()}
                </p>
                <p className="text-xs text-blue-300 truncate">
                  {getUserEmail()}
                </p>
                {userData?.role && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-cyan-500/30 text-cyan-200 text-xs rounded-full">
                    {userData.role}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="space-y-1 px-3">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;

              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center ${
                    isCollapsed ? "justify-center" : "justify-start"
                  } space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? "bg-white/20 text-white shadow-lg"
                      : "text-blue-200 hover:bg-white/10 hover:text-white"
                  }`}
                  title={isCollapsed ? item.name : ""}
                >
                  <Icon
                    className={`${
                      isCollapsed ? "w-6 h-6" : "w-5 h-5"
                    } flex-shrink-0 ${
                      isActive ? "text-white" : "text-blue-300"
                    } group-hover:text-white transition-colors`}
                  />
                  {!isCollapsed && (
                    <span className="font-medium text-sm flex-1 text-left">
                      {item.name}
                    </span>
                  )}
                  {!isCollapsed && item.badge && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Bottom Section - Logout */}
        <div className="border-t border-blue-700/50">
          <div className="space-y-1 px-3 py-4">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center ${
                isCollapsed ? "justify-center" : "justify-start"
              } space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group text-red-300 hover:bg-red-500/20 hover:text-red-200`}
              title={isCollapsed ? "Logout" : ""}
            >
              <LogOut
                className={`${
                  isCollapsed ? "w-6 h-6" : "w-5 h-5"
                } flex-shrink-0 transition-colors`}
              />
              {!isCollapsed && (
                <span className="font-medium text-sm">Logout</span>
              )}
            </button>
          </div>
        </div>

        {/* Collapsed Avatar */}
        {isCollapsed && (
          <div className="p-3 border-t border-blue-700/50">
            <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 flex items-center justify-center text-white font-bold">
              {getUserInitial()}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
