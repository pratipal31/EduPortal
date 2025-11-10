"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import {
  Trophy,
  CheckCircle,
  TrendingUp,
  Activity,
  Award,
  X,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

interface UserProfile {
  id: string;
  clerk_id: string;
  email: string;
  role: string;
  created_at: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  total_questions: number;
  duration: number;
  passing_score: number;
}

interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  correct_answer: string | null;
  options: string[] | null;
  match_pairs: Array<{ left: string; right: string }> | null;
  blanks: string[] | null;
  points: number;
  explanation: string | null;
  order_index: number;
}

interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  score: number;
  total_points: number;
  percentage: number;
  passed: boolean;
  time_taken: number;
  answers: any;
  started_at: string;
  completed_at: string;
  status: string;
  quiz?: Quiz;
}

export default function StudentDashboard() {
  const { user, isLoaded } = useUser();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<QuizAttempt[]>([]);
  const [stats, setStats] = useState({
    totalAttempts: 0,
    averageScore: 0,
    completedQuizzes: 0,
    totalQuizzes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [viewingAttempt, setViewingAttempt] = useState<QuizAttempt | null>(null);
  const [attemptQuestions, setAttemptQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;

      try {
        const { data: users, error: queryError } = await supabase
          .from("users")
          .select("*")
          .eq("clerk_id", user.id);

        if (queryError) {
          console.error("❌ Error querying users:", queryError);
          throw new Error(queryError.message);
        }

        if (!users || users.length === 0) {
          console.warn(`No user profile found for clerk_id=${user.id}, creating one...`);
          
          const { data: newUser, error: insertError } = await supabase
            .from("users")
            .insert({
              clerk_id: user.id,
              email: user.emailAddresses[0]?.emailAddress || "",
              role: "student",
            })
            .select()
            .single();

          if (insertError) {
            console.error("❌ Error creating user:", {
              message: insertError.message,
              details: insertError.details,
              hint: insertError.hint,
              code: insertError.code
            });
            return;
          }

          console.log("✅ User created successfully:", newUser);
          setUserProfile(newUser);
          return;
        }

        if (users.length > 1) {
          console.warn(`Multiple profiles found for clerk_id=${user.id}`);
        }

        console.log("✅ User profile loaded:", users[0]);
        setUserProfile(users[0]);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error("Error fetching user profile:", {
          message: errorMessage,
          clerkId: user.id,
          error: err
        });
      }
    };

    if (isLoaded && user) {
      fetchUserProfile();
    }
  }, [user, isLoaded]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userProfile?.id) return;

      try {
        setLoading(true);

        const { data: quizzes, error: quizzesError } = await supabase
          .from("quizzes")
          .select("*")
          .eq("is_published", true);

        if (quizzesError) throw quizzesError;

        const { data: attempts, error: attemptsError } = await supabase
          .from("quiz_attempts")
          .select(`
            *,
            quizzes (
              id,
              title,
              description,
              difficulty,
              total_questions,
              duration,
              passing_score
            )
          `)
          .eq("student_id", userProfile.id)
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(5);

        if (attemptsError) throw attemptsError;

        setRecentAttempts(attempts || []);

        const totalAttempts = attempts?.length || 0;
        const averageScore =
          totalAttempts > 0
            ? attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) /
              totalAttempts
            : 0;

        const uniqueQuizzes = new Set(
          attempts?.map((attempt) => attempt.quiz_id)
        );

        setStats({
          totalAttempts,
          averageScore: Math.round(averageScore),
          completedQuizzes: uniqueQuizzes.size,
          totalQuizzes: quizzes?.length || 0,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userProfile]);

  const viewAttemptDetails = async (attempt: QuizAttempt) => {
    try {
      const questionIds = attempt.answers.map((a: any) => a.question_id);
      const { data: questions, error } = await supabase
        .from("questions")
        .select("*")
        .in("id", questionIds);

      if (error) throw error;

      setViewingAttempt(attempt);
      setAttemptQuestions(questions || []);
    } catch (error) {
      console.error("Error fetching attempt details:", error);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium text-sm sm:text-base">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (viewingAttempt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-800 line-clamp-2 pr-2">
                Quiz Results: {viewingAttempt.quiz?.title}
              </h2>
              <button
                onClick={() => {
                  setViewingAttempt(null);
                  setAttemptQuestions([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Score</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-600">
                  {viewingAttempt.score}/{viewingAttempt.total_points}
                </p>
              </div>
              <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Percentage</p>
                <p className="text-lg sm:text-2xl font-bold text-purple-600">
                  {viewingAttempt.percentage}%
                </p>
              </div>
              <div
                className={`p-3 sm:p-4 rounded-lg ${
                  viewingAttempt.passed ? "bg-green-50" : "bg-red-50"
                }`}
              >
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Status</p>
                <p
                  className={`text-lg sm:text-2xl font-bold ${
                    viewingAttempt.passed ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {viewingAttempt.passed ? "Passed" : "Failed"}
                </p>
              </div>
            </div>

            <div className="space-y-4 sm:space-y-6">
              {viewingAttempt.answers.map((answer: any, idx: number) => {
                const question = attemptQuestions.find(
                  (q) => q.id === answer.question_id
                );
                if (!question) return null;

                return (
                  <div
                    key={idx}
                    className={`p-4 sm:p-6 rounded-lg border-2 ${
                      answer.is_correct
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-gray-800 flex-1 pr-2 text-sm sm:text-base">
                        Q{idx + 1}. {question.question_text}
                      </h3>
                      {answer.is_correct ? (
                        <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0" />
                      )}
                    </div>

                    <div className="space-y-2 text-xs sm:text-sm">
                      <div>
                        <span className="font-medium text-gray-700">
                          Your Answer:{" "}
                        </span>
                        <span className="text-gray-600 break-words">
                          {JSON.stringify(answer.student_answer)}
                        </span>
                      </div>
                      {!answer.is_correct && answer.correct_answer && (
                        <div>
                          <span className="font-medium text-gray-700">
                            Correct Answer:{" "}
                          </span>
                          <span className="text-green-600 break-words">
                            {answer.correct_answer}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-gray-700">
                          Points:{" "}
                        </span>
                        <span>
                          {answer.points_earned}/{answer.points_possible}
                        </span>
                      </div>
                      {question.explanation && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <span className="font-medium text-blue-900">
                            Explanation:{" "}
                          </span>
                          <span className="text-blue-800">
                            {question.explanation}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600 bg-green-100";
    if (percentage >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Welcome back, {user?.firstName || userProfile?.email}! 👋
              </h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                Student Dashboard
              </p>  
            </div>
            <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-4">
              <div className="flex items-center space-x-2 bg-blue-100 px-3 sm:px-4 py-2 rounded-full">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                <span className="font-semibold text-blue-900 text-xs sm:text-sm">
                  {stats.averageScore}% Avg
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-gray-500 text-xs sm:text-sm font-medium mb-1">
                  Total Quizzes
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {stats.totalQuizzes}
                </p>
              </div>
              <div className="bg-blue-100 p-2 sm:p-4 rounded-lg sm:rounded-xl self-end sm:self-auto">
                <CheckCircle className="w-5 h-5 sm:w-8 sm:h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-gray-500 text-xs sm:text-sm font-medium mb-1">
                  Completed
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {stats.completedQuizzes}
                </p>
              </div>
              <div className="bg-green-100 p-2 sm:p-4 rounded-lg sm:rounded-xl self-end sm:self-auto">
                <CheckCircle className="w-5 h-5 sm:w-8 sm:h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-gray-500 text-xs sm:text-sm font-medium mb-1">
                  Average Score
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {stats.averageScore}%
                </p>
              </div>
              <div className="bg-purple-100 p-2 sm:p-4 rounded-lg sm:rounded-xl self-end sm:self-auto">
                <TrendingUp className="w-5 h-5 sm:w-8 sm:h-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-gray-500 text-xs sm:text-sm font-medium mb-1">
                  Total Attempts
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {stats.totalAttempts}
                </p>
              </div>
              <div className="bg-orange-100 p-2 sm:p-4 rounded-lg sm:rounded-xl self-end sm:self-auto">
                <Activity className="w-5 h-5 sm:w-8 sm:h-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-yellow-600" />
                Recent Attempts
              </h2>

              <div className="space-y-3 sm:space-y-4">
                {recentAttempts.length > 0 ? (
                  recentAttempts.map((attempt) => (
                    <div
                      key={attempt.id}
                      className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                      onClick={() => viewAttemptDetails(attempt)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-800 text-sm sm:text-base flex-1 pr-2 line-clamp-2">
                          {attempt.quiz?.title || "Quiz"}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold flex-shrink-0 ${getScoreColor(
                            attempt.percentage
                          )}`}
                        >
                          {attempt.percentage}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span>
                          Score: {attempt.score}/{attempt.total_points}
                        </span>
                        <span className="hidden sm:inline">
                          {new Date(attempt.completed_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold ${
                            attempt.passed
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {attempt.passed ? "✓ Passed" : "✗ Failed"}
                        </span>
                        <button className="text-blue-600 text-xs font-semibold hover:text-blue-700">
                          View Details →
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 sm:py-12">
                    <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm sm:text-base">
                      No attempts yet. Start a quiz to see your progress!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white">
              <h3 className="text-base sm:text-lg font-bold mb-4">Your Progress</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm sm:text-base">
                  <span className="text-blue-100">Completion Rate</span>
                  <span className="font-bold">
                    {stats.totalQuizzes > 0
                      ? Math.round(
                          (stats.completedQuizzes / stats.totalQuizzes) * 100
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-white h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        stats.totalQuizzes > 0
                          ? (stats.completedQuizzes / stats.totalQuizzes) * 100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
                <div className="pt-4 border-t border-white/20">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-100">Best Score</span>
                      <span className="font-semibold">
                        {recentAttempts.length > 0 
                          ? Math.max(...recentAttempts.map(a => a.percentage))
                          : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-100">Total Points</span>
                      <span className="font-semibold">
                        {recentAttempts.reduce((sum, a) => sum + a.score, 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}