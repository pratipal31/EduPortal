"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import type { Quiz } from "@/lib/types"
import { Trash2, Eye, EyeOff, Clock, FileText, Target, BookOpen } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabaseClient"

export default function MyQuizPage() {
  const { user, isLoaded } = useUser()
  const supabase = getSupabaseClient()

  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<{ id: string } | null>(null)

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return
      try {
        const { data } = await supabase.from("users").select("id").eq("clerk_id", user.id).single()
        setUserProfile(data)
      } catch (error) {
        console.error("Error fetching user profile:", error)
      }
    }

    if (isLoaded && user) fetchUserProfile()
  }, [user, isLoaded, supabase])

  useEffect(() => {
    const fetchQuizzes = async () => {
      if (!userProfile?.id) return
      setLoading(true)
      try {
        const { data } = await supabase
          .from("quizzes")
          .select("*")
          .eq("teacher_id", userProfile.id)
          .order("created_at", { ascending: false })
        setQuizzes(data || [])
      } catch (error) {
        console.error("Error fetching quizzes:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchQuizzes()
  }, [userProfile, supabase])

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("Are you sure? This will delete all questions and attempts.")) return
    try {
      await supabase.from("quizzes").delete().eq("id", quizId)
      setQuizzes(quizzes.filter((q) => q.id !== quizId))
    } catch (error) {
      console.error("Error deleting quiz:", error)
      alert("Failed to delete quiz")
    }
  }

  const handleTogglePublish = async (quiz: Quiz) => {
    try {
      await supabase.from("quizzes").update({ is_published: !quiz.is_published }).eq("id", quiz.id)
      setQuizzes(quizzes.map((q) => (q.id === quiz.id ? { ...q, is_published: !q.is_published } : q)))
    } catch (error) {
      console.error("Error updating quiz:", error)
    }
  }

  if (!isLoaded || loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            My Quizzes
          </h1>
          <p className="text-gray-600 mt-2">Manage and view all your created quizzes</p>
        </div>

        {quizzes.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 border border-gray-100 text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No quizzes yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-xl font-bold text-gray-800">{quiz.title}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          quiz.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {quiz.is_published ? "Published" : "Draft"}
                      </span>
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
                    </div>

                    <p className="text-gray-600 mb-3">{quiz.description}</p>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <FileText className="w-4 h-4" />
                        <span>{quiz.total_questions} questions</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{quiz.duration} mins</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Target className="w-4 h-4" />
                        <span>Pass: {quiz.passing_score}%</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      onClick={() => handleTogglePublish(quiz)}
                      className={`p-2 rounded-lg transition-colors ${
                        quiz.is_published
                          ? "bg-green-100 text-green-600 hover:bg-green-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                      title={quiz.is_published ? "Unpublish" : "Publish"}
                    >
                      {quiz.is_published ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
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
        )}
      </div>
    </div>
  )
}
