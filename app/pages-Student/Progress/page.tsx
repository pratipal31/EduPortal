"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { TrendingUp, Target, Zap, Activity, Calendar, Loader2, AlertCircle, LineChart } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabaseClient"

interface ProgressStats {
  totalAttempts: number
  averageScore: number
  bestScore: number
  totalPointsEarned: number
  totalPointsAvailable: number
  weeklyProgress: Array<{
    date: string
    score: number
    count: number
  }>
  monthlyProgress: Array<{
    month: string
    average: number
    count: number
  }>
  difficultyBreakdown: Record<
    string,
    {
      average: number
      attempts: number
    }
  >
}

export default function ProgressPage() {
  const { user, isLoaded } = useUser()
  const [stats, setStats] = useState<ProgressStats>({
    totalAttempts: 0,
    averageScore: 0,
    bestScore: 0,
    totalPointsEarned: 0,
    totalPointsAvailable: 0,
    weeklyProgress: [],
    monthlyProgress: [],
    difficultyBreakdown: {},
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProgress = async () => {
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

        // Fetch all attempts
        const { data: attempts, error: attemptsError } = await supabase
          .from("quiz_attempts")
          .select(
            `
            *,
            quizzes(difficulty)
          `,
          )
          .eq("student_id", profile.id)
          .eq("status", "completed")
          .order("completed_at", { ascending: true })

        if (attemptsError) throw attemptsError

        if (!attempts || attempts.length === 0) {
          setStats({
            totalAttempts: 0,
            averageScore: 0,
            bestScore: 0,
            totalPointsEarned: 0,
            totalPointsAvailable: 0,
            weeklyProgress: [],
            monthlyProgress: [],
            difficultyBreakdown: {},
          })
          return
        }

        // Calculate overall stats
        const totalAttempts = attempts.length
        const scores = attempts.map((a) => a.percentage)
        const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / totalAttempts)
        const bestScore = Math.max(...scores)
        const totalPointsEarned = Math.round(attempts.reduce((sum, a) => sum + a.score, 0))
        const totalPointsAvailable = attempts.reduce((sum, a) => sum + a.total_points, 0)

        // Calculate weekly progress (last 7 days)
        const today = new Date()
        const weeklyData: Record<string, { score: number; count: number }> = {}

        attempts.forEach((attempt) => {
          const date = new Date(attempt.completed_at)
          const dayDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

          if (dayDiff < 7) {
            const dateStr = date.toISOString().split("T")[0]
            if (!weeklyData[dateStr]) {
              weeklyData[dateStr] = { score: 0, count: 0 }
            }
            weeklyData[dateStr].score += attempt.percentage
            weeklyData[dateStr].count++
          }
        })

        const weeklyProgress = Object.entries(weeklyData)
          .map(([date, data]) => ({
            date,
            score: Math.round(data.score / data.count),
            count: data.count,
          }))
          .sort((a, b) => a.date.localeCompare(b.date))

        // Calculate monthly progress
        const monthlyData: Record<string, { scores: number[]; count: number }> = {}

        attempts.forEach((attempt) => {
          const date = new Date(attempt.completed_at)
          const monthStr = date.toISOString().slice(0, 7)

          if (!monthlyData[monthStr]) {
            monthlyData[monthStr] = { scores: [], count: 0 }
          }
          monthlyData[monthStr].scores.push(attempt.percentage)
          monthlyData[monthStr].count++
        })

        const monthlyProgress = Object.entries(monthlyData)
          .map(([month, data]) => ({
            month,
            average: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
            count: data.count,
          }))
          .sort((a, b) => a.month.localeCompare(b.month))

        // Calculate difficulty breakdown
        const difficultyData: Record<string, { scores: number[]; count: number }> = {}

        attempts.forEach((attempt) => {
          const difficulty = attempt.quizzes?.difficulty || "unknown"

          if (!difficultyData[difficulty]) {
            difficultyData[difficulty] = { scores: [], count: 0 }
          }
          difficultyData[difficulty].scores.push(attempt.percentage)
          difficultyData[difficulty].count++
        })

        const difficultyBreakdown: Record<
          string,
          {
            average: number
            attempts: number
          }
        > = {}

        Object.entries(difficultyData).forEach(([difficulty, data]) => {
          difficultyBreakdown[difficulty] = {
            average: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
            attempts: data.count,
          }
        })

        setStats({
          totalAttempts,
          averageScore,
          bestScore,
          totalPointsEarned,
          totalPointsAvailable,
          weeklyProgress,
          monthlyProgress,
          difficultyBreakdown,
        })
      } catch (err) {
        console.error("Error fetching progress:", err)
        setError("Failed to load progress. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchProgress()
  }, [user, isLoaded])

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
            <LineChart className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600" />
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Your Progress
            </h1>
          </div>
          <p className="text-gray-600 text-sm sm:text-base">Track your learning journey and improvement</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {stats.totalAttempts === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-lg">
            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium mb-2">No progress data yet</p>
            <p className="text-gray-400 text-sm">Complete some quizzes to see your progress!</p>
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-600 text-sm font-medium">Total Attempts</p>
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.totalAttempts}</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-600 text-sm font-medium">Average Score</p>
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.averageScore}%</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-600 text-sm font-medium">Best Score</p>
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.bestScore}%</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-600 text-sm font-medium">Total Points</p>
                  <Zap className="w-5 h-5 text-yellow-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalPointsEarned}/{stats.totalPointsAvailable}
                </p>
              </div>
            </div>

            {/* Weekly Progress */}
            {stats.weeklyProgress.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Weekly Progress
                </h2>
                <div className="space-y-3">
                  {stats.weeklyProgress.map((day) => (
                    <div key={day.date}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {new Date(day.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {day.score}% ({day.count} attempt
                          {day.count !== 1 ? "s" : ""})
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-purple-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${day.score}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly Progress */}
            {stats.monthlyProgress.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  Monthly Progress
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.monthlyProgress.map((month) => (
                    <div
                      key={month.month}
                      className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200"
                    >
                      <p className="text-sm font-medium text-gray-600 mb-2">
                        {new Date(month.month).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                        })}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 mb-1">{month.average}%</p>
                      <p className="text-xs text-gray-600">
                        {month.count} attempt{month.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Difficulty Breakdown */}
            {Object.keys(stats.difficultyBreakdown).length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  Performance by Difficulty
                </h2>
                <div className="space-y-4">
                  {Object.entries(stats.difficultyBreakdown).map(([difficulty, data]) => (
                    <div key={difficulty}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 capitalize">{difficulty}</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {data.average}% ({data.attempts} attempt
                          {data.attempts !== 1 ? "s" : ""})
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            difficulty === "easy"
                              ? "bg-green-500"
                              : difficulty === "medium"
                                ? "bg-yellow-500"
                                : difficulty === "hard"
                                  ? "bg-orange-500"
                                  : "bg-red-500"
                          }`}
                          style={{ width: `${data.average}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
