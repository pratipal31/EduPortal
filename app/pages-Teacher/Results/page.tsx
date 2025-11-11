"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { getSupabaseClient } from "@/lib/supabaseClient"
import type { QuizAttempt, Quiz } from "@/lib/types"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Filter, ChevronDown, BarChart3, List } from "lucide-react"

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
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

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
        const { data: quizzesData } = await supabase.from("quizzes").select("*").eq("teacher_id", userProfile.id)

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

  const truncateEmail = (email: string) => {
    const [name] = email.split("@")
    return name.length > 10 ? name.substring(0, 10) + "..." : name
  }

  const chartData = filteredResults.map((r) => ({
    name: truncateEmail(r.studentEmail),
    fullEmail: r.studentEmail,
    percentage: Math.round(r.attempt.percentage),
    status: r.attempt.passed ? "Passed" : "Failed",
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg max-w-[200px]">
          <p className="font-semibold text-gray-800 text-sm break-all">{payload[0].payload.fullEmail}</p>
          <p className="text-indigo-600 text-sm">Score: {payload[0].value}%</p>
          <p className={`text-sm font-medium ${payload[0].payload.status === "Passed" ? "text-green-600" : "text-red-600"}`}>
            {payload[0].payload.status}
          </p>
        </div>
      )
    }
    return null
  }

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
          <p className="text-sm sm:text-base text-gray-600 mt-2">View student results and performance</p>
        </div>

        {/* Filters */}
        <div className="mb-4 sm:mb-6 bg-white rounded-xl shadow-lg p-4 border border-gray-100">
          <div className="flex items-center space-x-2 mb-3">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
            <span className="font-semibold text-sm sm:text-base text-gray-800">Filter by Quiz:</span>
          </div>
          <div className="relative">
            <select
              value={selectedQuiz}
              onChange={(e) => setSelectedQuiz(e.target.value)}
              className="w-full p-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white pr-10"
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

        {/* View Toggle */}
        <div className="mb-4 sm:mb-6">
          <div className="bg-white rounded-xl shadow-lg p-2 border border-gray-100 flex gap-2">
            <button
              onClick={() => setViewMode('chart')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${viewMode === 'chart'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Chart View</span>
              <span className="sm:hidden">Chart</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${viewMode === 'table'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Table View</span>
              <span className="sm:hidden">Table</span>
            </button>
          </div>
        </div>

        {/* Chart View */}
        {viewMode === 'chart' && chartData.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-800">
              Student Performance Overview
            </h2>
            <div className="w-full">
              <ResponsiveContainer width="100%" height={300} className="sm:hidden">
                <BarChart data={chartData} margin={{ top: 10, right: 5, left: -15, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 9 }}
                    interval={0}
                  />
                  <YAxis
                    label={{ value: '%', position: 'insideLeft', style: { fontSize: 10 } }}
                    domain={[0, 100]}
                    tick={{ fontSize: 9 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="percentage" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <ResponsiveContainer width="100%" height={350} className="hidden sm:block lg:hidden">
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={90}
                    tick={{ fontSize: 11 }}
                    interval={0}
                  />
                  <YAxis
                    label={{ value: 'Score (%)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />
                  <Bar dataKey="percentage" fill="#6366f1" name="Score (%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <ResponsiveContainer width="100%" height={400} className="hidden lg:block">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 12 }}
                    interval={0}
                  />
                  <YAxis
                    label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
                    domain={[0, 100]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="percentage" fill="#6366f1" name="Score (%)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Detailed Results</h2>
            </div>
            {filteredResults.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 text-sm sm:text-base">
                  No results found for the selected filter.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="block lg:hidden divide-y divide-gray-100">
                  {filteredResults.map((r) => (
                    <div key={r.attempt.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col space-y-3">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 break-words leading-tight">
                              {r.studentEmail}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{r.quiz.title}</p>
                          </div>
                          <span
                            className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap flex-shrink-0 ${r.attempt.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}
                          >
                            {r.attempt.passed ? "Passed" : "Failed"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">Score</p>
                            <span className="text-2xl font-bold text-indigo-600">
                              {Math.round(r.attempt.percentage)}%
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-0.5">Date</p>
                            <span className="text-xs text-gray-700 font-medium">
                              {new Date(r.attempt.completed_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
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
                        <tr key={r.attempt.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-800">
                            <div className="max-w-[200px] truncate" title={r.studentEmail}>
                              {r.studentEmail}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-800">
                            <div className="max-w-[200px] truncate" title={r.quiz.title}>
                              {r.quiz.title}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-lg font-bold text-indigo-600">
                              {Math.round(r.attempt.percentage)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${r.attempt.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
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
        )}
      </div>
    </div>
  )
}