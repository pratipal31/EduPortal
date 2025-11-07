"use client";

import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

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
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
