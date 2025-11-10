import React from "react";
import ThreeDPhotoCarousel from "@/components/ui/3d-carousel";
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
        <section className="w-full flex items-center justify-center px-4 sm:px-6 py-4 sm:py-6">
          <div className="max-w-4xl w-full px-2 sm:px-4 text-center">
            <h1 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-extrabold leading-tight text-gray-900 mb-3 sm:mb-4">
              Empower Teachers. Inspire Learning.
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto mb-4 sm:mb-6 px-2">
              EduPortal helps you create meaningful assessments, track classroom progress, and unlock insights that improve student outcomes.
            </p>
          </div>
        </section>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-12 items-center min-h-[calc(50vh-6rem)]">
          {/* Text column */}
          <div className="w-full text-left space-y-4 sm:space-y-6 md:space-y-8 py-4 sm:py-8 md:py-12 px-2 sm:px-4">
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-purple-700 leading-relaxed">
              <span className="font-semibold text-purple-700">EduPortal</span> helps students
              practice, learn, and grow through well-designed assessments. Teachers can create
              interactive quizzes, auto-graded MCQs, and rubrics that give instant feedback —
              guiding every learner toward measurable progress.
            </p>

            <ul className="space-y-3 sm:space-y-4 text-sm sm:text-base md:text-lg text-purple-600 font-medium">
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0"></span>
                <span>Interactive quizzes with instant scoring</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0"></span>
                <span>Clear feedback and performance insights</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0"></span>
                <span>Class progress dashboards and downloadable reports</span>
              </li>
            </ul>
          </div>

          {/* Carousel column - Fully responsive */}
          <div className="w-full flex items-center justify-center py-4 md:py-0 min-h-[500px] sm:min-h-[550px] md:min-h-0">
            <div className="w-full h-[450px] sm:h-[500px] md:h-[500px] lg:h-[600px] xl:h-[700px] rounded-2xl overflow-visible">
              <ThreeDPhotoCarousel />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Carousel;