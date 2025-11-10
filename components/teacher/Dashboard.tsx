"use client";

import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import {
  Users,
  BookOpen,
  TrendingUp,
  FileText,
  Trash2,
  Eye,
  Clock,
  Target,
  Award,
  BarChart3,
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
  is_published: boolean;
  created_at: string;
}

interface Question {
  id?: string;
  quiz_id?: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  correct_answer: string;
  options: string[] | null;
  match_pairs: Array<{ left: string; right: string }> | null;
  blanks: string[] | null;
  points: number;
  explanation: string;
  order_index: number;
}

export default function TeacherDashboard() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalQuizzes: 0,
    totalAttempts: 0,
    activeStudents: 0,
  });
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [viewMode, setViewMode] = useState<"dashboard" | "quizzes" | "analytics">("dashboard");

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("clerk_id", user.id)
          .single();

        if (error) throw error;
        setUserProfile(data);
      } catch (error) {
        console.error("Error fetching user profile:", error);
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

        const { data: allUsers } = await supabase.from("users").select("*");

        const totalStudents = allUsers?.filter((u) => u.role === "student").length || 0;
        const totalTeachers = allUsers?.filter((u) => u.role === "teacher").length || 0;

        const { data: quizzesData } = await supabase
          .from("quizzes")
          .select("*")
          .eq("teacher_id", userProfile.id)
          .order("created_at", { ascending: false });

        const { data: attemptsData } = await supabase
          .from("quiz_attempts")
          .select("*, quizzes!inner(teacher_id)")
          .eq("quizzes.teacher_id", userProfile.id);

        const uniqueStudents = new Set(attemptsData?.map((a) => a.student_id));

        setStats({
          totalStudents,
          totalTeachers,
          totalQuizzes: quizzesData?.length || 0,
          totalAttempts: attemptsData?.length || 0,
          activeStudents: uniqueStudents.size,
        });

        setQuizzes(quizzesData || []);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userProfile]);



  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("Are you sure you want to delete this quiz?")) return;

    try {
      const { error } = await supabase.from("quizzes").delete().eq("id", quizId);

      if (error) throw error;

      setQuizzes(quizzes.filter((q) => q.id !== quizId));
    } catch (error) {
      console.error("Error deleting quiz:", error);
      alert("Failed to delete quiz");
    }
  };

  const handleTogglePublish = async (quiz: Quiz) => {
    try {
      const { error } = await supabase
        .from("quizzes")
        .update({ is_published: !quiz.is_published })
        .eq("id", quiz.id);

      if (error) throw error;

      setQuizzes(
        quizzes.map((q) =>
          q.id === quiz.id ? { ...q, is_published: !q.is_published } : q
        )
      );
    } catch (error) {
      console.error("Error updating quiz:", error);
      alert("Failed to update quiz");
    }
  };



  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                   Welcome back, {user?.firstName || userProfile?.email}!
              </h1>
              <p className="text-gray-600 mt-1">
                Teacher's Dashboard
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-indigo-100 px-4 py-2 rounded-full">
                <Award className="w-5 h-5 text-indigo-600" />
                <span className="font-semibold text-indigo-900">
                  {stats.totalQuizzes} Total Quizzes
                </span>
              </div>
            </div>

          </div>

          {/* Navigation */}
          <div className="flex flex-wrap gap-2 mt-6">
            <button
              onClick={() => setViewMode("dashboard")}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                viewMode === "dashboard"
                  ? "bg-indigo-100 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setViewMode("quizzes")}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                viewMode === "quizzes"
                  ? "bg-indigo-100 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              My Quizzes
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === "dashboard" && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
                  <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">
                      Total Students
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats.totalStudents}
                    </p>
                  </div>
                  <div className="bg-blue-100 p-4 rounded-xl">
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
              </div>

                  <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">
                      Active Students
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats.activeStudents}
                    </p>
                  </div>
                  <div className="bg-green-100 p-4 rounded-xl">
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </div>

                  <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">
                      Total Quizzes
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats.totalQuizzes}
                    </p>
                  </div>
                  <div className="bg-purple-100 p-4 rounded-xl">
                    <BookOpen className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </div>

                  <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">
                      Total Attempts
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats.totalAttempts}
                    </p>
                  </div>
                  <div className="bg-orange-100 p-4 rounded-xl">
                    <FileText className="w-8 h-8 text-orange-600" />
                  </div>
                </div>
              </div>

                  <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">
                      Total Teachers
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats.totalTeachers}
                    </p>
                  </div>
                  <div className="bg-pink-100 p-4 rounded-xl">
                    <Award className="w-8 h-8 text-pink-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Quizzes */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Recent Quizzes
              </h2>
              <div className="space-y-4">
                {quizzes.slice(0, 5).map((quiz) => (
                  <div
                    key={quiz.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100 gap-3"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{quiz.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{quiz.description}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>{quiz.total_questions} questions</span>
                        <span>{quiz.duration} mins</span>
                        <span
                          className={`px-2 py-1 rounded-full ${
                            quiz.is_published
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {quiz.is_published ? "Published" : "Draft"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {viewMode === "quizzes" && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">All Quizzes</h2>
            <div className="space-y-4">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-800">
                          {quiz.title}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            quiz.difficulty === "easy"
                              ? "bg-green-100 text-green-700"
                              : quiz.difficulty === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : quiz.difficulty === "hard"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {quiz.difficulty}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            quiz.is_published
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {quiz.is_published ? "Published" : "Draft"}
                        </span>
                      </div>
                      <p className="text-gray-600">{quiz.description}</p>
                      <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                        <span className="flex items-center">
                          <FileText className="w-4 h-4 mr-1" />
                          {quiz.total_questions} questions
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {quiz.duration} mins
                        </span>
                        <span className="flex items-center">
                          <Target className="w-4 h-4 mr-1" />
                          Pass: {quiz.passing_score}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleTogglePublish(quiz)}
                        className={`p-2 rounded-lg transition-colors ${
                          quiz.is_published
                            ? "bg-green-100 text-green-600 hover:bg-green-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                        title={quiz.is_published ? "Unpublish" : "Publish"}
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}