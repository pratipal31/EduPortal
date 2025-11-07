import React from "react";
import ThreeDPhotoCarousel  from "@/components/ui/3d-carousel";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
const Carousel = () => {
  return (
    <section className="w-full min-h-screen bg-linear-to-br from-purple-100 via-white to-purple-50 py-6 md:py-12 px-4">
      <div className="container mx-auto max-w-[1600px] h-full">
          <section className="w-full flex items-center justify-center  px-6 py-6">
            <div className="max-w-4xl w-full px-4 text-center">
              <h1 className="text-3xl sm:text-3xl md:text-3xl lg:text-4xl font-extrabold leading-tight text-gray-900 mb-4">
                Empower Teachers. Inspire Learning.
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-6">
                EduPortal helps you create meaningful assess    ments, track classroom progress, and unlock insights that improve student outcomes.
              </p>
            </div>
          </section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center min-h-[calc(50vh-6rem)]">
          {/* Text column */}
          <div className="w-full text-left space-y-6 md:space-y-8 py-8 md:py-12">
            <p className="text-lg sm:text-xl lg:text-2xl text-purple-700 leading-relaxed">
              <span className="font-semibold text-purple-700">EduPortal</span> helps students
              practice, learn, and grow through well-designed assessments. Teachers can create
              interactive quizzes, auto-graded MCQs, and rubrics that give instant feedback —
              guiding every learner toward measurable progress.
            </p>

            <ul className="space-y-4 text-lg text-purple-600 font-medium">
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                <span>Interactive quizzes with instant scoring</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                <span>Clear feedback and performance insights</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                <span>Class progress dashboards and downloadable reports</span>
              </li>
            </ul>

              <SignedOut>
            <SignUpButton mode="modal">
              <button className="inline-flex items-center justify-center rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 transition-all duration-200">
                Join Us
              </button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          </div>

          {/* Carousel column */}
          <div className="w-full h-full flex items-center justify-center py-4 md:py-0">
            <div className="w-full aspect-square md:aspect-auto md:h-[600px] xl:h-[700px] rounded-2xl overflow-hidden ">
              <ThreeDPhotoCarousel />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Carousel;
