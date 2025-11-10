"use client";

import React, { useState } from "react";
import StudentNavbar from "../../components/student/Navbar";
import { Menu, X } from "lucide-react";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // ✅ Wrapper function to match expected type (open?: boolean) => void
  const handleMobileToggle = (open?: boolean) => {
    setMobileOpen(open !== undefined ? open : !mobileOpen);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Student Navbar */}
      <StudentNavbar
        isCollapsed={isCollapsed}
        onCollapseChange={setIsCollapsed}
        mobileOpen={mobileOpen}
        onMobileToggle={handleMobileToggle}
      />
      {/* ✅ fixed type-safe toggle */}

      {/* Main Content Area */}
      <div
        className={`flex-1 transition-all duration-300 ${
          isCollapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        {/* Mobile Header with Menu Toggle */}
        <div className="md:hidden sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-2 rounded-lg">
                <Menu className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-gray-800">Student Portal</h1>
            </div>
            <button
              onClick={() => handleMobileToggle()}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <X className="w-6 h-6 text-gray-600" />
              ) : (
                <Menu className="w-6 h-6 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <main className="p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
