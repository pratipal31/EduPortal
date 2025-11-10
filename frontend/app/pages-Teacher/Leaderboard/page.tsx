"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { getSupabaseClient } from "@/lib/supabaseClient"
import type { QuizAttempt, Quiz } from "@/lib/types"
import { Award, Trophy, Zap } from "lucide-react"

interface LeaderboardEntry {
  studentId: string
  studentEmail: string
  totalAttempts: number
  avgScore: number
  passedCount: number
  totalPoints: number
  rank: number
}

export default function LeaderboardPage() {
  const { user, isLoaded } = useUser()
  const supabase = getSupabaseClient()

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQuiz, setSelectedQuiz] = useState<string>("all")
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
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
    const fetchLeaderboard = async () => {
      if (!userProfile?.id) return
      setLoading(true)
      try {
        const { data: quizzesData } = await supabase.from("quizzes").select("*").eq("teacher_id", userProfile.id)

        setQuizzes(quizzesData || [])

        if (quizzesData && quizzesData.length > 0) {
          const quizIds = quizzesData.map((q) => q.id)
          let query = supabase.from("quiz_attempts").select("*")

          if (selectedQuiz !== "all") {
            query = query.eq("quiz_id", selectedQuiz)
          } else {
            query = query.in("quiz_id", quizIds)
          }

          const { data: attemptsData } = await query

          // Group by student
          const studentMap = new Map<
            string,
            {
              attempts: QuizAttempt[]
              email: string
            }
          >()

          for (const attempt of attemptsData || []) {
            const { data: studentData } = await supabase
              .from("users")
              .select("email")
              .eq("id", attempt.student_id)
              .single()

            if (!studentMap.has(attempt.student_id)) {
              studentMap.set(attempt.student_id, {
                attempts: [],
                email: studentData?.email || "Unknown",
              })
            }
            studentMap.get(attempt.student_id)!.attempts.push(attempt)
          }

          // Calculate rankings
          const entries: LeaderboardEntry[] = Array.from(studentMap.entries()).map(
            ([studentId, { attempts, email }], index) => ({
              studentId,
              studentEmail: email,
              totalAttempts: attempts.length,
              avgScore:
                attempts.length > 0
                  ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
                  : 0,
              passedCount: attempts.filter((a) => a.passed).length,
              totalPoints: attempts.reduce((sum, a) => sum + a.score, 0),
              rank: 0,
            }),
          )

          // Sort by average score (descending)
          entries.sort((a, b) => b.avgScore - a.avgScore)
          entries.forEach((entry, idx) => (entry.rank = idx + 1))

          setLeaderboard(entries)
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [userProfile, selectedQuiz, supabase])

  if (!isLoaded || loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-100 text-yellow-700 border-yellow-300"
      case 2:
        return "bg-gray-100 text-gray-700 border-gray-300"
      case 3:
        return "bg-orange-100 text-orange-700 border-orange-300"
      default:
        return "bg-blue-100 text-blue-700 border-blue-300"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
            <Trophy className="w-8 h-8" />
            Leaderboard
          </h1>
          <p className="text-gray-600 mt-2">Student rankings based on quiz performance</p>
        </div>

        {/* Filter */}
        <div className="mb-6 bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
          <label className="block text-sm font-medium mb-2">Filter by Quiz:</label>
          <select
            value={selectedQuiz}
            onChange={(e) => setSelectedQuiz(e.target.value)}
            className="w-full sm:w-64 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Quizzes</option>
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title}
              </option>
            ))}
          </select>
        </div>

        {/* Leaderboard */}
        {leaderboard.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 border border-gray-100 text-center">
            <Zap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No quiz attempts yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {leaderboard.map((entry) => (
              <div
                key={entry.studentId}
                className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300"
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-2 ${getMedalColor(
                        entry.rank,
                      )}`}
                    >
                      {entry.rank === 1 ? (
                        <Trophy className="w-6 h-6" />
                      ) : entry.rank === 2 ? (
                        <Award className="w-6 h-6" />
                      ) : entry.rank === 3 ? (
                        <Zap className="w-6 h-6" />
                      ) : (
                        entry.rank
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{entry.studentEmail}</h3>
                      <p className="text-sm text-gray-500">Rank #{entry.rank}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Avg Score</p>
                      <p className="text-2xl font-bold text-indigo-600">{entry.avgScore}%</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Attempts</p>
                      <p className="text-2xl font-bold text-purple-600">{entry.totalAttempts}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Passed</p>
                      <p className="text-2xl font-bold text-green-600">{entry.passedCount}</p>
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
