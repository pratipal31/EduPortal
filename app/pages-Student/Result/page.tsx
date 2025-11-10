"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import { BarChart3, Filter, Loader2, AlertCircle, CheckCircle2, XCircle, ArrowRight } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabaseClient"

interface QuizAttempt {
  id: string
  quiz_id: string
  quiz: {
    title: string
    total_questions: number
    difficulty: string
  }
  score: number
  total_points: number
  percentage: number
  passed: boolean
  time_taken: number
  completed_at: string
}

type SortBy = "recent" | "score" | "quiz"

export default function MyResultsPage() {
  const { user, isLoaded } = useUser()
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [filteredAttempts, setFilteredAttempts] = useState<QuizAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortBy>("recent")
  const [filterPassed, setFilterPassed] = useState<"all" | "passed" | "failed">("all")

  useEffect(() => {
    const fetchResults = async () => {
      if (!isLoaded || !user) return

      try {
        const supabase = getSupabaseClient()

        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("id")
          .eq("clerk_id", user.id)
          .single()

        if (profileError) throw profileError

        // Fetch attempts
        const { data: attemptsData, error: attemptsError } = await supabase
          .from("quiz_attempts")
          .select(
            `
            *,
            quizzes(title, total_questions, difficulty)
          `,
          )
          .eq("student_id", profile.id)
          .eq("status", "completed")
          .order("completed_at", { ascending: false })

        if (attemptsError) throw attemptsError

        const formattedAttempts =
          attemptsData?.map((attempt: any) => ({
            ...attempt,
            quiz: attempt.quizzes,
          })) || []

        setAttempts(formattedAttempts)
        applyFiltersAndSort(formattedAttempts, sortBy, filterPassed)
      } catch (err) {
        console.error("Error fetching results:", err)
        setError("Failed to load results. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [user, isLoaded])

  useEffect(() => {
    applyFiltersAndSort(attempts, sortBy, filterPassed)
  }, [sortBy, filterPassed])

  const applyFiltersAndSort = (data: QuizAttempt[], sort: SortBy, filter: "all" | "passed" | "failed") => {
    let filtered = data

    // Apply filter
    if (filter === "passed") {
      filtered = filtered.filter((a) => a.passed)
    } else if (filter === "failed") {
      filtered = filtered.filter((a) => !a.passed)
    }

    // Apply sort
    const sorted = [...filtered]
    switch (sort) {
      case "score":
        sorted.sort((a, b) => b.percentage - a.percentage)
        break
      case "quiz":
        sorted.sort((a, b) => a.quiz.title.localeCompare(b.quiz.title))
        break
      case "recent":
      default:
        sorted.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
    }

    setFilteredAttempts(sorted)
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "bg-green-100 text-green-700"
      case "medium":
        return "bg-yellow-100 text-yellow-700"
      case "hard":
        return "bg-orange-100 text-orange-700"
      case "advanced":
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const getScoreBadgeColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-100 text-green-700"
    if (percentage >= 60) return "bg-yellow-100 text-yellow-700"
    return "bg-red-100 text-red-700"
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              My Results
            </h1>
          </div>
          <p className="text-gray-600 text-sm sm:text-base">Review all your quiz attempts and performance</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Filters */}
        {attempts.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="recent">Most Recent</option>
                  <option value="score">Highest Score</option>
                  <option value="quiz">Quiz Name</option>
                </select>
              </div>

              {/* Filter By Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filterPassed}
                  onChange={(e) => setFilterPassed(e.target.value as "all" | "passed" | "failed")}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">All Results</option>
                  <option value="passed">Passed Only</option>
                  <option value="failed">Failed Only</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Results List */}
        {filteredAttempts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-lg">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium mb-2">
              {attempts.length === 0 ? "No results yet" : "No results match your filters"}
            </p>
            <p className="text-gray-400 text-sm mb-6">
              {attempts.length === 0 ? "Take a quiz to see your results here!" : "Try adjusting your filters"}
            </p>
            {attempts.length === 0 && (
              <Link
                href="/available-quizzes"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                <span>Start a Quiz</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAttempts.map((attempt) => (
              <div
                key={attempt.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {/* Quiz Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{attempt.quiz.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(attempt.completed_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}{" "}
                            at{" "}
                            {new Date(attempt.completed_at).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getDifficultyColor(
                            attempt.quiz.difficulty,
                          )}`}
                        >
                          {attempt.quiz.difficulty}
                        </span>
                      </div>
                    </div>

                    {/* Score and Status */}
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="text-center">
                        <p
                          className={`text-2xl font-bold ${
                            attempt.percentage >= 80
                              ? "text-green-600"
                              : attempt.percentage >= 60
                                ? "text-yellow-600"
                                : "text-red-600"
                          }`}
                        >
                          {attempt.percentage}%
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {Math.round(attempt.score)}/{attempt.total_points}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {attempt.passed ? (
                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-600" />
                        )}
                        <span className={`text-sm font-semibold ${attempt.passed ? "text-green-600" : "text-red-600"}`}>
                          {attempt.passed ? "Passed" : "Failed"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Questions</p>
                      <p className="text-sm font-semibold text-gray-900">{attempt.quiz.total_questions}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Time Taken</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {Math.floor(attempt.time_taken / 60)}m {attempt.time_taken % 60}s
                      </p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-xs text-gray-600 mb-1">Attempt ID</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">{attempt.id.substring(0, 8)}...</p>
                    </div>
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
