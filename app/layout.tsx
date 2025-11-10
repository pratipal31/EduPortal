"use client";

import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import  AuthRedirector  from "@/components/AuthRedirector";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <title>EduPortal - Empowering Teachers, Inspiring Learning</title>
        </head>
        <body>
          <AuthRedirector />
          {children}</body>
      </html>
    </ClerkProvider>
  );
}
