"use client";
import { AnimatedSignIn } from "@/components/pages/Login";
import { Navbar } from "@/components/pages/Navbar";

export default function Home() {
  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100">
       <main className="w-full flex flex-col items-center px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6">Welcome To Edu Portal</h1>
        <AnimatedSignIn />
      </main>
    </div>
  );
}
