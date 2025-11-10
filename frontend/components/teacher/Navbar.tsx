"use client";

import React from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  FileQuestion,
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  ClipboardList,
  Award,
} from "lucide-react";

interface NavItem {
  name: string;
  icon: any;
  path: string;
  badge?: number;
}

type Props = {
  isCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  onMobileToggle?: (open?: boolean) => void;
};

export default function TeacherNavbar({
  isCollapsed = false,
  onCollapseChange = () => {},
  mobileOpen = false,
  onMobileToggle = () => {},
}: Props) {
  const { signOut } = useClerk();
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const navigationItems: NavItem[] = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/pages-Teacher/TeacherDashboard",
    },
    {
      name: "My Quizzes",
      icon: BookOpen,
      path: "/pages-Teacher/MyQuiz",
    },
    {
      name: "Create Quiz",
      icon: FileQuestion,
      path: "/pages-Teacher/CreateQuiz",
    },
    {
      name: "Students",
      icon: Users,
      path: "/pages-Teacher/ShowStudents",
    },
    {
      name: "Results",
      icon: ClipboardList,
      path: "/pages-Teacher/Results",
    },
    {
      name: "Analytics",
      icon: BarChart3,
      path: "/pages-Teacher/Analytics",
    },
    {
      name: "Leaderboard",
      icon: Award,
      path: "/pages-Teacher/Leaderboard",
    },
  ];

  const bottomItems: NavItem[] = [
    {
      name: "Settings",
      icon: Settings,
      path: "/pages-Teacher/Settings",
    },
    {
      name: "Help",
      icon: HelpCircle,
      path: "/pages-Teacher/Help",
    },
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
    // close mobile menu after navigation
    if (mobileOpen) onMobileToggle(false);
  };

  const handleLogout = async () => {
    await signOut({ redirectUrl: "/" });
  };

  return (
    <>
      {/* backdrop for mobile */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 md:hidden ${mobileOpen ? "block" : "hidden"}`}
        onClick={() => onMobileToggle(false)}
      />

      <div
        className={`${isCollapsed ? "w-20" : "w-64"} min-h-screen bg-gradient-to-b from-indigo-900 via-indigo-800 to-purple-900 text-white transition-all duration-300 ease-in-out flex flex-col fixed left-0 top-0 shadow-2xl z-50 transform ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
      {/* Logo/Brand Section */}
      <div className="p-6 border-b border-indigo-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
              <GraduationCap className="w-8 h-8 text-indigo-300" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-xl font-bold">EduPortal</h1>
              </div>
            )}
          </div>
          <button
            onClick={() => onCollapseChange(!isCollapsed)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`${isCollapsed ? "hidden" : "hidden md:inline-flex"} p-2 hover:bg-white/10 rounded-lg transition-colors`}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Floating expand button shown only when collapsed on md+ */}
      {isCollapsed && (
        <button
          onClick={() => onCollapseChange(false)}
          aria-label="Expand sidebar"
          className="hidden md:flex absolute -right-3 top-6 z-50 w-7 h-7 bg-white/95 text-indigo-900 rounded-full items-center justify-center shadow-lg border border-gray-200"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* User Profile Section */}
      {!isCollapsed && (
        <div className="p-4 border-b border-indigo-700/50">
          <div className="flex items-center space-x-3 bg-white/5 p-3 rounded-lg backdrop-blur-sm">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold text-lg">
              {user?.firstName?.charAt(0) || user?.emailAddresses[0]?.emailAddress.charAt(0) || "T"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="font-semibold text-sm truncate">
                {user?.firstName || "Teacher"}
              </p>
              <p className="text-xs text-indigo-300 truncate">
                {user?.emailAddresses[0]?.emailAddress}
              </p>
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
                    : "text-indigo-200 hover:bg-white/10 hover:text-white"
                }`}
                title={isCollapsed ? item.name : ""}
              >
                <Icon
                  className={`${
                    isCollapsed ? "w-6 h-6" : "w-5 h-5"
                  } flex-shrink-0 ${
                    isActive ? "text-white" : "text-indigo-300"
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

      {/* Bottom Section */}
      <div className="border-t border-indigo-700/50">
        <div className="space-y-1 px-3 py-4">
          {bottomItems.map((item) => {
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
                    ? "bg-white/20 text-white"
                    : "text-indigo-200 hover:bg-white/10 hover:text-white"
                }`}
                title={isCollapsed ? item.name : ""}
              >
                <Icon
                  className={`${
                    isCollapsed ? "w-6 h-6" : "w-5 h-5"
                  } flex-shrink-0 text-indigo-300 group-hover:text-white transition-colors`}
                />
                {!isCollapsed && (
                  <span className="font-medium text-sm">{item.name}</span>
                )}
              </button>
            );
          })}

          {/* Logout Button */}
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

      {/* Collapsed User Avatar */}
      {isCollapsed && (
        <div className="p-3 border-t border-indigo-700/50">
          <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold">
            {user?.firstName?.charAt(0) || user?.emailAddresses[0]?.emailAddress.charAt(0) || "T"}
          </div>
        </div>
      )}
    </div>
    </>
  );
}

// HOW TO USE THIS COMPONENT:
// 1. Import it in your layout.tsx or any page:
//    import TeacherNavbar from "@/components/TeacherNavbar";
//
// 2. Wrap your content with it (add margin-left to account for navbar width):
//    <div className="flex">
//      <TeacherNavbar />
//      <main className="ml-64 w-full"> {/* ml-64 when expanded, ml-20 when collapsed */}
//        {children}
//      </main>
//    </div>
//
// 3. Create the placeholder pages for each route:
//    - app/pages-Teacher/TeacherDashboard/page.tsx
//    - app/pages-Teacher/MyQuizzes/page.tsx
//    - app/pages-Teacher/CreateQuiz/page.tsx
//    - etc.