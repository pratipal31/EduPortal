"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { getSupabaseClient } from "@/lib/supabaseClient"
import type { QuizAttempt, Quiz } from "@/lib/types"
import { Filter, ChevronDown, List } from "lucide-react"

interface ResultData {
  attempt: QuizAttempt
  quiz: Quiz
  studentEmail: string
}

export default function ResultsPage() {
  const { user, isLoaded } = useUser()
  const supabase = getSupabaseClient()

  const [results, setResults] = useState<ResultData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQuiz, setSelectedQuiz] = useState<string>("all")
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [userProfile, setUserProfile] = useState<{ id: string } | null>(null)

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return
      try {
        const { data } = await supabase
          .from("users")
          .select("id")
          .eq("clerk_id", user.id)
          .single()
        setUserProfile(data)
      } catch (error) {
        console.error("Error fetching user profile:", error)
      }
    }

    if (isLoaded && user) fetchUserProfile()
  }, [user, isLoaded, supabase])

  useEffect(() => {
    const fetchResults = async () => {
      if (!userProfile?.id) return
      setLoading(true)
      try {
        const { data: quizzesData } = await supabase
          .from("quizzes")
          .select("*")
          .eq("teacher_id", userProfile.id)

        setQuizzes(quizzesData || [])

        if (quizzesData && quizzesData.length > 0) {
          const quizIds = quizzesData.map((q) => q.id)
          const { data: attemptsData } = await supabase
            .from("quiz_attempts")
            .select("*")
            .in("quiz_id", quizIds)
            .order("completed_at", { ascending: false })

          const resultsWithDetails = await Promise.all(
            (attemptsData || []).map(async (attempt) => {
              const quiz = quizzesData.find((q) => q.id === attempt.quiz_id)
              const { data: studentData } = await supabase
                .from("users")
                .select("email")
                .eq("id", attempt.student_id)
                .single()

              return {
                attempt,
                quiz: quiz!,
                studentEmail: studentData?.email || "Unknown",
              }
            })
          )

          setResults(resultsWithDetails)
        }
      } catch (error) {
        console.error("Error fetching results:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [userProfile, supabase])

  const filteredResults =
    selectedQuiz === "all"
      ? results
      : results.filter((r) => r.quiz.id === selectedQuiz)

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Quiz Results
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            View student results and performance
          </p>
        </div>

        {/* Filter */}
        <div className="mb-4 sm:mb-6 bg-white rounded-xl shadow-lg p-4 border border-gray-100">
          <div className="flex items-center space-x-2 mb-3">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            <span className="font-semibold text-sm sm:text-base text-gray-800">
              Filter by Quiz:
            </span>
          </div>
          <div className="relative">
            <select
              value={selectedQuiz}
              onChange={(e) => setSelectedQuiz(e.target.value)}
              className="w-full p-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 appearance-none bg-white pr-10"
            >
              <option value="all">All Quizzes</option>
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* ✅ Table View Only */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">
              Detailed Results
            </h2>
            <List className="w-5 h-5 text-indigo-600" />
          </div>

          {filteredResults.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 text-sm sm:text-base">
                No results found for the selected filter.
              </p>
            </div>
          ) : (
            <>
              {/* 📱 Mobile Card View */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-4 p-4">
                {filteredResults.map((r) => (
                  <div
                    key={r.attempt.id}
                    className="bg-gray-50 rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm break-words">
                          {r.studentEmail}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {r.quiz.title}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                          r.attempt.passed
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {r.attempt.passed ? "Passed" : "Failed"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mt-3 border-t border-gray-200 pt-3">
                      <div>
                        <p className="text-xs text-gray-500">Score</p>
                        <p className="text-xl font-bold text-indigo-600">
                          {Math.round(r.attempt.percentage)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Date</p>
                        <p className="text-xs text-gray-700 font-medium">
                          {new Date(
                            r.attempt.completed_at
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 💻 Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Quiz
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                        Score
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredResults.map((r) => (
                      <tr
                        key={r.attempt.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-gray-800 truncate max-w-[200px]">
                          {r.studentEmail}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-800 truncate max-w-[200px]">
                          {r.quiz.title}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-lg font-bold text-indigo-600">
                            {Math.round(r.attempt.percentage)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                              r.attempt.passed
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {r.attempt.passed ? "Passed" : "Failed"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                          {new Date(r.attempt.completed_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
