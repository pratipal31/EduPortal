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

          // Calculate stats
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

  const quizPerformance = quizzes.map((quiz) => {
    const quizAttempts = attempts.filter((a) => a.quiz_id === quiz.id)
    return {
      name: quiz.title,
      avgScore:
        quizAttempts.length > 0
          ? Math.round(quizAttempts.reduce((sum, a) => sum + a.percentage, 0) / quizAttempts.length)
          : 0,
      attempts: quizAttempts.length,
    }
  })

  const passFailData = [
    {
      name: "Passed",
      value: attempts.filter((a) => a.passed).length,
      fill: "#10b981",
    },
    {
      name: "Failed",
      value: attempts.filter((a) => !a.passed).length,
      fill: "#ef4444",
    },
  ]

  if (!isLoaded || loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-2">View comprehensive quiz and student performance data</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Total Attempts</span>
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.totalAttempts}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Average Score</span>
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.avgScore}%</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Pass Rate</span>
              <BookOpen className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.passRate}%</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Unique Students</span>
              <Users className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.totalStudents}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold mb-4">Quiz Performance</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={quizPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avgScore" fill="#6366f1" name="Avg Score (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold mb-4">Pass/Fail Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={passFailData} cx="50%" cy="50%" labelLine={false} label>
                  {passFailData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
