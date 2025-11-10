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

        // Fetch all completed attempts with student emails
        const { data: attempts, error: attemptsError } = await supabase
          .from("quiz_attempts")
          .select(
            `
            student_id,
            score,
            total_points,
            percentage,
            users(email)
          `,
          )
          .eq("status", "completed")

        if (attemptsError) throw attemptsError

        // Group by student and calculate stats
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

        // Calculate averages and convert to array
        const leaderboardData: LeaderboardEntry[] = Object.values(studentStats).map((stats: any) => ({
          student_id: stats.student_id,
          email: stats.email,
          averageScore: Math.round(stats.scores.reduce((a: number, b: number) => a + b, 0) / stats.scores.length),
          totalAttempts: stats.totalAttempts,
          bestScore: Math.max(...stats.scores),
        }))

        // Sort by average score
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
        return <Medal className="w-6 h-6 text-yellow-500" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />
      case 3:
        return <Medal className="w-6 h-6 text-orange-600" />
      default:
        return <span className="text-lg font-bold text-gray-400">{position}</span>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-500" />
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Leaderboards
            </h1>
          </div>
          <p className="text-gray-600 text-sm sm:text-base">Top performers based on average quiz scores</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {leaderboard.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-lg">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium mb-2">No scores yet</p>
            <p className="text-gray-400 text-sm">Start taking quizzes to appear on the leaderboard!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.student_id}
                className={`rounded-xl p-6 transition-all duration-300 ${
                  index === 0
                    ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 shadow-lg"
                    : index === 1
                      ? "bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-300 shadow-md"
                      : index === 2
                        ? "bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 shadow-md"
                        : "bg-white border border-gray-200 shadow"
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                      {getMedalIcon(index + 1)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 truncate">{entry.email}</h3>
                      <p className="text-sm text-gray-600">
                        {entry.totalAttempts} attempt{entry.totalAttempts !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">{entry.averageScore}%</p>
                      <p className="text-xs text-gray-600">Average</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-2xl font-bold text-green-600">{entry.bestScore}%</p>
                      <p className="text-xs text-gray-600">Best</p>
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
