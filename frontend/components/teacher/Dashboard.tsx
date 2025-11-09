"use client";

import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import {
  Users,
  BookOpen,
  TrendingUp,
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  Clock,
  Target,
  Award,
  BarChart3,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  LogOut,
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
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);
  const [showCreateQuestions, setShowCreateQuestions] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [quizForm, setQuizForm] = useState({
    title: "",
    description: "",
    difficulty: "easy",
    duration: 30,
    passing_score: 60,
    is_published: false,
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    question_text: "",
    question_type: "multiple_choice",
    difficulty: "easy",
    correct_answer: "",
    options: ["", "", "", ""],
    match_pairs: null,
    blanks: null,
    points: 1,
    explanation: "",
    order_index: 0,
  });
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

  const handleCreateQuiz = async () => {
    if (!userProfile?.id || !quizForm.title) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("quizzes")
        .insert({
          ...quizForm,
          teacher_id: userProfile.id,
        })
        .select()
        .single();

      if (error) throw error;

      setQuizzes([data, ...quizzes]);
      setShowCreateQuiz(false);
      setQuizForm({
        title: "",
        description: "",
        difficulty: "easy",
        duration: 30,
        passing_score: 60,
        is_published: false,
      });
      setSelectedQuiz(data);
      setShowCreateQuestions(true);
    } catch (error) {
      console.error("Error creating quiz:", error);
      alert("Failed to create quiz");
    }
  };

  const handleAddQuestion = () => {
    if (!currentQuestion.question_text) {
      alert("Please enter a question");
      return;
    }

    setQuestions([...questions, { ...currentQuestion, order_index: questions.length }]);
    setCurrentQuestion({
      question_text: "",
      question_type: "multiple_choice",
      difficulty: "easy",
      correct_answer: "",
      options: ["", "", "", ""],
      match_pairs: null,
      blanks: null,
      points: 1,
      explanation: "",
      order_index: 0,
    });
  };

  const handleSaveQuestions = async () => {
    if (!selectedQuiz?.id || questions.length === 0) {
      alert("Please add at least one question");
      return;
    }

    try {
      const questionsToInsert = questions.map((q) => ({
        quiz_id: selectedQuiz.id,
        question_text: q.question_text,
        question_type: q.question_type,
        difficulty: q.difficulty,
        correct_answer: q.correct_answer,
        options: q.options ? q.options : null,
        match_pairs: q.match_pairs ? q.match_pairs : null,
        blanks: q.blanks ? q.blanks : null,
        points: q.points,
        explanation: q.explanation,
        order_index: q.order_index,
      }));

      const { error } = await supabase.from("questions").insert(questionsToInsert);

      if (error) throw error;

      alert("Questions saved successfully!");
      setShowCreateQuestions(false);
      setQuestions([]);
      setSelectedQuiz(null);

      const { data: updatedQuizzes } = await supabase
        .from("quizzes")
        .select("*")
        .eq("teacher_id", userProfile?.id)
        .order("created_at", { ascending: false });

      setQuizzes(updatedQuizzes || []);
    } catch (error) {
      console.error("Error saving questions:", error);
      alert("Failed to save questions");
    }
  };

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

  const renderQuestionForm = () => {
    switch (currentQuestion.question_type) {
      case "multiple_choice":
        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Options (4 required)
            </label>
            {currentQuestion.options?.map((option, idx) => (
              <input
                key={idx}
                type="text"
                value={option}
                onChange={(e) => {
                  const newOptions = [...(currentQuestion.options || [])];
                  newOptions[idx] = e.target.value;
                  setCurrentQuestion({ ...currentQuestion, options: newOptions });
                }}
                placeholder={`Option ${idx + 1}`}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correct Answer
              </label>
              <select
                value={currentQuestion.correct_answer}
                onChange={(e) =>
                  setCurrentQuestion({ ...currentQuestion, correct_answer: e.target.value })
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select correct answer</option>
                {currentQuestion.options?.map((option, idx) => (
                  <option key={idx} value={option}>
                    {option || `Option ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case "true_false":
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correct Answer
            </label>
            <select
              value={currentQuestion.correct_answer}
              onChange={(e) =>
                setCurrentQuestion({ ...currentQuestion, correct_answer: e.target.value })
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select answer</option>
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          </div>
        );

      case "fill_in_blank":
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correct Answers (one per blank)
            </label>
            <div className="space-y-2">
              {(currentQuestion.blanks || [""]).map((blank, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={blank}
                  onChange={(e) => {
                    const newBlanks = [...(currentQuestion.blanks || [""])];
                    newBlanks[idx] = e.target.value;
                    setCurrentQuestion({ ...currentQuestion, blanks: newBlanks });
                  }}
                  placeholder={`Answer for blank ${idx + 1}`}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ))}
              <button
                type="button"
                onClick={() =>
                  setCurrentQuestion({
                    ...currentQuestion,
                    blanks: [...(currentQuestion.blanks || []), ""],
                  })
                }
                className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
              >
                + Add Another Blank
              </button>
            </div>
          </div>
        );

      case "match_following":
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Match Pairs
            </label>
            <div className="space-y-3">
              {(currentQuestion.match_pairs || [{ left: "", right: "" }]).map((pair, idx) => (
                <div key={idx} className="flex gap-3">
                  <input
                    type="text"
                    value={pair.left}
                    onChange={(e) => {
                      const newPairs = [...(currentQuestion.match_pairs || [])];
                      newPairs[idx] = { ...newPairs[idx], left: e.target.value };
                      setCurrentQuestion({ ...currentQuestion, match_pairs: newPairs });
                    }}
                    placeholder="Left item"
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={pair.right}
                    onChange={(e) => {
                      const newPairs = [...(currentQuestion.match_pairs || [])];
                      newPairs[idx] = { ...newPairs[idx], right: e.target.value };
                      setCurrentQuestion({ ...currentQuestion, match_pairs: newPairs });
                    }}
                    placeholder="Right match"
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setCurrentQuestion({
                    ...currentQuestion,
                    match_pairs: [
                      ...(currentQuestion.match_pairs || []),
                      { left: "", right: "" },
                    ],
                  })
                }
                className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
              >
                + Add Another Pair
              </button>
            </div>
          </div>
        );

      case "short_answer":
      case "long_answer":
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sample Correct Answer (Optional - for reference)
            </label>
            <textarea
              value={currentQuestion.correct_answer}
              onChange={(e) =>
                setCurrentQuestion({ ...currentQuestion, correct_answer: e.target.value })
              }
              rows={currentQuestion.question_type === "long_answer" ? 4 : 2}
              placeholder="Enter a sample correct answer..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Note: These questions require manual grading
            </p>
          </div>
        );

      default:
        return null;
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Teacher Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user?.firstName || userProfile?.email}! 👋
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-indigo-100 px-4 py-2 rounded-full">
                <Award className="w-5 h-5 text-indigo-600" />
                <span className="font-semibold text-indigo-900">
                  {stats.totalQuizzes} Total Quizzes
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center space-x-2 bg-red-100 hover:bg-red-200 text-red-600 px-4 py-2 rounded-full transition-colors duration-200"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-semibold">Logout</span>
              </button>
            </div>
            <button
              onClick={() => setShowCreateQuiz(true)}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-semibold shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Create Quiz</span>
            </button>
          </div>

          {/* Navigation */}
          <div className="flex space-x-4 mt-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center justify-between">
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
                <div className="flex items-center justify-between">
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
                <div className="flex items-center justify-between">
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
                <div className="flex items-center justify-between">
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
                <div className="flex items-center justify-between">
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
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{quiz.title}</h3>
                      <p className="text-sm text-gray-600">{quiz.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
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
                  <div className="flex items-start justify-between mb-4">
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

      {/* Create Quiz Modal */}
      {showCreateQuiz && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Create New Quiz</h2>
              <button
                onClick={() => setShowCreateQuiz(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quiz Title *
                </label>
                <input
                  type="text"
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  placeholder="Enter quiz title"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={quizForm.description}
                  onChange={(e) =>
                    setQuizForm({ ...quizForm, description: e.target.value })
                  }
                  placeholder="Enter quiz description"
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty
                  </label>
                  <select
                    value={quizForm.difficulty}
                    onChange={(e) =>
                      setQuizForm({ ...quizForm, difficulty: e.target.value })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={quizForm.duration}
                    onChange={(e) =>
                      setQuizForm({ ...quizForm, duration: parseInt(e.target.value) })
                    }
                    min="1"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passing Score (%)
                </label>
                <input
                  type="number"
                  value={quizForm.passing_score}
                  onChange={(e) =>
                    setQuizForm({ ...quizForm, passing_score: parseInt(e.target.value) })
                  }
                  min="0"
                  max="100"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="publish"
                  checked={quizForm.is_published}
                  onChange={(e) =>
                    setQuizForm({ ...quizForm, is_published: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="publish" className="text-sm font-medium text-gray-700">
                  Publish immediately
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowCreateQuiz(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateQuiz}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
                >
                  Create & Add Questions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Questions Modal */}
      {showCreateQuestions && selectedQuiz && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Add Questions to: {selectedQuiz.title}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {questions.length} question(s) added
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCreateQuestions(false);
                    setQuestions([]);
                    setSelectedQuiz(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Question Form */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-6 border border-indigo-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  New Question
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Question Text *
                    </label>
                    <textarea
                      value={currentQuestion.question_text}
                      onChange={(e) =>
                        setCurrentQuestion({
                          ...currentQuestion,
                          question_text: e.target.value,
                        })
                      }
                      placeholder="Enter your question here..."
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Question Type
                      </label>
                      <select
                        value={currentQuestion.question_type}
                        onChange={(e) =>
                          setCurrentQuestion({
                            ...currentQuestion,
                            question_type: e.target.value,
                            options:
                              e.target.value === "multiple_choice"
                                ? ["", "", "", ""]
                                : null,
                            match_pairs:
                              e.target.value === "match_following"
                                ? [{ left: "", right: "" }]
                                : null,
                            blanks:
                              e.target.value === "fill_in_blank" ? [""] : null,
                          })
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="true_false">True/False</option>
                        <option value="fill_in_blank">Fill in the Blank</option>
                        <option value="match_following">Match Following</option>
                        <option value="short_answer">Short Answer</option>
                        <option value="long_answer">Long Answer</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Difficulty
                      </label>
                      <select
                        value={currentQuestion.difficulty}
                        onChange={(e) =>
                          setCurrentQuestion({
                            ...currentQuestion,
                            difficulty: e.target.value,
                          })
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Points
                      </label>
                      <input
                        type="number"
                        value={currentQuestion.points}
                        onChange={(e) =>
                          setCurrentQuestion({
                            ...currentQuestion,
                            points: parseInt(e.target.value) || 1,
                          })
                        }
                        min="1"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {renderQuestionForm()}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Explanation (Optional)
                    </label>
                    <textarea
                      value={currentQuestion.explanation}
                      onChange={(e) =>
                        setCurrentQuestion({
                          ...currentQuestion,
                          explanation: e.target.value,
                        })
                      }
                      placeholder="Provide an explanation for the answer..."
                      rows={2}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    onClick={handleAddQuestion}
                    className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add Question</span>
                  </button>
                </div>
              </div>

              {/* Added Questions List */}
              {questions.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    Added Questions ({questions.length})
                  </h3>
                  <div className="space-y-3">
                    {questions.map((q, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-bold text-gray-800">
                                Q{idx + 1}.
                              </span>
                              <span className="text-gray-800">
                                {q.question_text}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3 text-xs text-gray-500">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                                {q.question_type.replace("_", " ")}
                              </span>
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-semibold">
                                {q.difficulty}
                              </span>
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
                                {q.points} pts
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              setQuestions(questions.filter((_, i) => i !== idx))
                            }
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 sticky bottom-0 bg-white pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowCreateQuestions(false);
                    setQuestions([]);
                    setSelectedQuiz(null);
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveQuestions}
                  disabled={questions.length === 0}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Save className="w-5 h-5" />
                  <span>Save All Questions</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}