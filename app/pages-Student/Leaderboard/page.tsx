"use client"

import { useEffect, useState } from "react"
import { Trophy, Medal, Loader2, AlertCircle } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabaseClient"

interface LeaderboardEntry {
  student_id: string
  email: string
  averageScore: number
  totalAttempts: number
  bestScore: number
}

export default function LeaderboardsPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const supabase = getSupabaseClient()

        const { data: attempts, error: attemptsError } = await supabase
          .from("quiz_attempts")
          .select(
            `
            student_id,
            score,
            total_points,
            percentage,
            users(email)
          `
          )
          .eq("status", "completed")

        if (attemptsError) throw attemptsError

        const studentStats: Record<string, any> = {}

        attempts?.forEach((attempt: any) => {
          const studentId = attempt.student_id
          const email = attempt.users?.email || "Unknown"

          if (!studentStats[studentId]) {
            studentStats[studentId] = {
              student_id: studentId,
              email,
              scores: [],
              totalAttempts: 0,
            }
          }

          studentStats[studentId].scores.push(attempt.percentage)
          studentStats[studentId].totalAttempts++
        })

        const leaderboardData: LeaderboardEntry[] = Object.values(studentStats).map((stats: any) => ({
          student_id: stats.student_id,
          email: stats.email,
          averageScore: Math.round(
            stats.scores.reduce((a: number, b: number) => a + b, 0) / stats.scores.length
          ),
          totalAttempts: stats.totalAttempts,
          bestScore: Math.round(Math.max(...stats.scores)),
        }))

        leaderboardData.sort((a, b) => b.averageScore - a.averageScore)
        setLeaderboard(leaderboardData)
      } catch (err) {
        console.error("Error fetching leaderboard:", err)
        setError("Failed to load leaderboard. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [])

  const getMedalIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Medal className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
      case 2:
        return <Medal className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
      case 3:
        return <Medal className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
      default:
        return <span className="text-lg sm:text-xl font-bold text-gray-400">{position}</span>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-blue-600 mx-auto" />
          <p className="mt-3 text-sm sm:text-base text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 -m-4 md:-m-6 lg:-m-8">
      {/* Main Container with proper spacing */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-500 shrink-0" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Leaderboards
            </h1>
          </div>
          <p className="text-gray-600 text-sm sm:text-base">
            Top performers based on average quiz scores
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-red-700 text-xs sm:text-sm">{error}</p>
          </div>
        )}

        {/* No Scores */}
        {leaderboard.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-white rounded-xl shadow-lg">
            <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <p className="text-gray-500 text-base sm:text-lg font-medium mb-2">No scores yet</p>
            <p className="text-gray-400 text-xs sm:text-sm px-4">
              Start taking quizzes to appear on the leaderboard!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.student_id}
                className={`rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border ${index === 0
                  ? "bg-linear-to-r from-yellow-50 to-orange-50 border-yellow-200"
                  : index === 1
                    ? "bg-linear-to-r from-gray-50 to-gray-100 border-gray-300"
                    : index === 2
                      ? "bg-linear-to-r from-orange-50 to-red-50 border-orange-300"
                      : "bg-white border-gray-100"
                  }`}
              >
                <div className="p-4 sm:p-6">
                  {/* Rank and User Info */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                      {getMedalIcon(index + 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-lg font-bold text-gray-900 break-all">
                        {entry.email}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {entry.totalAttempts} attempt{entry.totalAttempts !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {/* Scores Row */}
                  <div className="flex items-center gap-4 pt-3 border-t border-gray-200">
                    <div className="flex-1 text-center">
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600">
                        {entry.averageScore}%
                      </p>
                      <p className="text-xs text-gray-600 mt-1">Average</p>
                    </div>
                    <div className="h-10 w-px bg-gray-300"></div>
                    <div className="flex-1 text-center">
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">
                        {entry.bestScore}%
                      </p>
                      <p className="text-xs text-gray-600 mt-1">Best</p>
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