"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { getSupabaseClient } from "@/lib/supabaseClient"
import type { QuizAttempt, Quiz } from "@/lib/types"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Filter } from "lucide-react"

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
        const { data } = await supabase.from("users").select("id").eq("clerk_id", user.id).single()
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
        // Fetch quizzes
        const { data: quizzesData } = await supabase.from("quizzes").select("*").eq("teacher_id", userProfile.id)

        setQuizzes(quizzesData || [])

        // Fetch results
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
            }),
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

  const filteredResults = selectedQuiz === "all" ? results : results.filter((r) => r.quiz.id === selectedQuiz)

  // Truncate student email for better display
  const truncateEmail = (email: string, maxLength: number = 12) => {
    const [name, domain] = email.split("@")
    if (name.length <= maxLength) return name
    return name.substring(0, maxLength) + "..."
  }

  const chartData = filteredResults.map((r) => ({
    name: truncateEmail(r.studentEmail),
    fullEmail: r.studentEmail,
    percentage: Math.round(r.attempt.percentage),
    status: r.attempt.passed ? "Passed" : "Failed",
  }))

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{payload[0].payload.fullEmail}</p>
          <p className="text-indigo-600">Score: {payload[0].value}%</p>
          <p className={`text-sm font-medium ${payload[0].payload.status === "Passed" ? "text-green-600" : "text-red-600"}`}>
            {payload[0].payload.status}
          </p>
        </div>
      )
    }
    return null
  }

  if (!isLoaded || loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Quiz Results
          </h1>
          <p className="text-gray-600 mt-2">View student results and performance</p>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="font-semibold text-gray-800">Filter by Quiz:</span>
          </div>
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

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Student Performance Overview</h2>
            <p className="text-sm text-gray-500 mb-4">Hover over bars for full student details</p>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 12 }}
                  interval={0}
                />
                <YAxis 
                  label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 12 }}
                  domain={[0, 100]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar 
                  dataKey="percentage" 
                  fill="#6366f1" 
                  name="Score (%)" 
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Results Table */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 overflow-x-auto">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Detailed Results</h2>
          {filteredResults.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No results found for the selected filter.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Student</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Quiz</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Score</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((r) => (
                  <tr key={r.attempt.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-800">{r.studentEmail}</td>
                    <td className="py-3 px-4 text-gray-800">{r.quiz.title}</td>
                    <td className="py-3 px-4 text-center font-semibold text-gray-900">{Math.round(r.attempt.percentage)}%</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          r.attempt.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {r.attempt.passed ? "Passed" : "Failed"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{new Date(r.attempt.completed_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}