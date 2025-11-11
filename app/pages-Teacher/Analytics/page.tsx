"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { getSupabaseClient } from "@/lib/supabaseClient"
import type { Quiz, QuizAttempt } from "@/lib/types"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { TrendingUp, Users, BookOpen, Target } from "lucide-react"

export default function AnalyticsPage() {
  const { user, isLoaded } = useUser()
  const supabase = getSupabaseClient()

  const [stats, setStats] = useState({
    totalAttempts: 0,
    avgScore: 0,
    passRate: 0,
    totalStudents: 0,
  })
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
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
    const fetchAnalytics = async () => {
      if (!userProfile?.id) return
      setLoading(true)
      try {
        const { data: quizzesData } = await supabase.from("quizzes").select("*").eq("teacher_id", userProfile.id)

        setQuizzes(quizzesData || [])

        if (quizzesData && quizzesData.length > 0) {
          const quizIds = quizzesData.map((q) => q.id)
          const { data: attemptsData } = await supabase.from("quiz_attempts").select("*").in("quiz_id", quizIds)

          setAttempts(attemptsData || [])

          const totalAttempts = attemptsData?.length || 0
          const avgScore =
            totalAttempts > 0 ? (attemptsData!.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts).toFixed(1) : 0
          const passedCount = attemptsData?.filter((a) => a.passed).length || 0
          const passRate = totalAttempts > 0 ? ((passedCount / totalAttempts) * 100).toFixed(1) : 0
          const uniqueStudents = new Set(attemptsData?.map((a) => a.student_id)).size

          setStats({
            totalAttempts,
            avgScore: Number.parseFloat(avgScore.toString()),
            passRate: Number.parseFloat(passRate.toString()),
            totalStudents: uniqueStudents,
          })
        }
      } catch (error) {
        console.error("Error fetching analytics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [userProfile, supabase])

  const truncateTitle = (title: string, maxLength: number = 12) => {
    return title.length > maxLength ? title.substring(0, maxLength) + "..." : title
  }

  const quizPerformance = quizzes.map((quiz) => {
    const quizAttempts = attempts.filter((a) => a.quiz_id === quiz.id)
    return {
      name: truncateTitle(quiz.title),
      fullName: quiz.title,
      avgScore:
        quizAttempts.length > 0
          ? Math.round(quizAttempts.reduce((sum, a) => sum + a.percentage, 0) / quizAttempts.length)
          : 0,
      attempts: quizAttempts.length,
    }
  })

  const passFailData = [
    { name: "Passed", value: attempts.filter((a) => a.passed).length, fill: "#10b981" },
    { name: "Failed", value: attempts.filter((a) => !a.passed).length, fill: "#ef4444" },
  ]

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg max-w-[200px]">
          <p className="font-semibold text-gray-800 text-sm">{payload[0].payload.fullName}</p>
          <p className="text-indigo-600 text-sm">Average Score: {payload[0].value}%</p>
          <p className="text-gray-600 text-xs">Attempts: {payload[0].payload.attempts}</p>
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
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-3 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Analytics Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            View comprehensive quiz and student performance data
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-8">
          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-xs sm:text-sm font-medium">Total Attempts</span>
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">{stats.totalAttempts}</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-xs sm:text-sm font-medium">Average Score</span>
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">{stats.avgScore}%</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-xs sm:text-sm font-medium">Pass Rate</span>
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">{stats.passRate}%</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 lg:p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-xs sm:text-sm font-medium">Unique Students</span>
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 flex-shrink-0" />
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">{stats.totalStudents}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="space-y-4 sm:space-y-6">
          {/* Bar Chart */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-800">
              Average Score by Quiz
            </h2>

            {/* Desktop Chart */}
            <div className="hidden lg:block">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={quizPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
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
                  <Bar dataKey="avgScore" fill="#6366f1" name="Avg Score (%)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tablet Chart */}
            <div className="hidden sm:block lg:hidden">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={quizPerformance} margin={{ top: 20, right: 20, left: 10, bottom: 70 }}>
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
                  <Bar dataKey="avgScore" fill="#6366f1" name="Avg Score (%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Mobile Chart */}
            <div className="block sm:hidden">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={quizPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 10 }}
                    interval={0}
                  />
                  <YAxis
                    label={{ value: 'Score', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
                    domain={[0, 100]}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avgScore" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-800">
              Pass/Fail Distribution
            </h2>

            {/* Desktop Pie Chart */}
            <div className="hidden lg:block">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={passFailData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={130}
                    innerRadius={70}
                    dataKey="value"
                  >
                    {passFailData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Tablet Pie Chart */}
            <div className="hidden sm:block lg:hidden">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={passFailData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={110}
                    innerRadius={60}
                    dataKey="value"
                    labelStyle={{ fontSize: '13px' }}
                  >
                    {passFailData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '13px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Mobile Pie Chart */}
            <div className="block sm:hidden">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={passFailData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.value}`}
                    outerRadius={85}
                    innerRadius={45}
                    dataKey="value"
                    labelStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  >
                    {passFailData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ fontSize: '12px' }}
                    formatter={(value) => <span className="text-xs font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Mobile Stats Summary */}
            <div className="block sm:hidden mt-4 grid grid-cols-2 gap-3">
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <p className="text-xs text-green-700 font-medium mb-1">Passed</p>
                <p className="text-2xl font-bold text-green-800">{passFailData[0].value}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                <p className="text-xs text-red-700 font-medium mb-1">Failed</p>
                <p className="text-2xl font-bold text-red-800">{passFailData[1].value}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}