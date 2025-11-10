"use client";

import React, { useState } from "react";
import TeacherNavbar from "@/components/teacher/Navbar";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // This function will be passed to the Navbar so it can toggle collapse
  const handleCollapseChange = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
  };

  const handleMobileToggle = (open?: boolean) => {
    if (typeof open === "boolean") setMobileOpen(open);
    else setMobileOpen((s) => !s);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {/* Sidebar (Navbar) */}
      <TeacherNavbar
        isCollapsed={isCollapsed}
        onCollapseChange={handleCollapseChange}
        mobileOpen={mobileOpen}
        onMobileToggle={handleMobileToggle}
      />

      {/* Mobile hamburger */}
      <button
        aria-label="Toggle menu"
        onClick={() => handleMobileToggle()}
        className="md:hidden fixed top-4 left-4 z-[60] p-2 bg-white/90 rounded-md shadow-lg"
      >
        {/* simple hamburger icon */}
        <span className="block w-5 h-0.5 bg-gray-800 mb-1"></span>
        <span className="block w-5 h-0.5 bg-gray-800 mb-1"></span>
        <span className="block w-5 h-0.5 bg-gray-800"></span>
      </button>

      {/* Main content area */}
      <main
        className={`flex-1 transition-all duration-300 ease-in-out ml-0 ${
          isCollapsed ? "md:ml-20" : "md:ml-64"
        } `}
      >
        {children}
      </main>
    </div>
  );
}
