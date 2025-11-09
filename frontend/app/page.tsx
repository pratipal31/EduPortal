"use client";
import { Navbar}  from "@/components/student/Navbar";
import {ThreeDPhotoCarousel} from "../components/ui/3d-carousel";
import  Carousel  from "../components/student/Carousel";
import AuthRedirector from "@/components/AuthRedirector";
export default function Home() {
  return (
  <div className="flex flex-col items-center min-h-screen bg-linear-to-b from-slate-50 to-white">
      <header className="w-full">
        <Navbar />
      </header>

      <main className="w-full flex flex-col items-center px-4 py-12">
        <AuthRedirector />
        {/* Hero */}
        <section>
          <Carousel/>
        </section>
      </main>
    </div>
  );
}
