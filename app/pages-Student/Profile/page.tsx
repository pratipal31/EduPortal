"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { User, Mail, Calendar, Loader2, AlertCircle, Award, BookOpen, TrendingUp } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabaseClient"

interface UserProfile {
  id: string
  clerk_id: string
  email: string
  role: string
  created_at: string
}

interface Stats {
  totalAttempts: number
  averageScore: number
  bestScore: number
  totalQuizzesCompleted: number
}

export default function ProfilePage() {
  const { user, isLoaded } = useUser()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<Stats>({
    totalAttempts: 0,
    averageScore: 0,
    bestScore: 0,
    totalQuizzesCompleted: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isLoaded || !user) return

      try {
        const supabase = getSupabaseClient()

        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("clerk_id", user.id)
          .single()

        if (profileError) {
          if (profileError.code === "PGRST116") {
            // No profile found, create one
            const { data: newProfile, error: insertError } = await supabase
              .from("users")
              .insert({
                clerk_id: user.id,
                email: user.emailAddresses[0]?.emailAddress || "",
                role: "student",
              })
              .select()
              .single()

            if (insertError) throw insertError
            setProfile(newProfile)
          } else {
            throw profileError
          }
        } else {
          setProfile(profileData)
        }

        if (profileData?.id) {
          // Fetch quiz attempt statistics
          const { data: attempts, error: attemptsError } = await supabase
            .from("quiz_attempts")
            .select("score, total_points, percentage")
            .eq("student_id", profileData.id)
            .eq("status", "completed")

          if (!attemptsError && attempts) {
            const totalAttempts = attempts.length
            const bestScore = Math.max(...attempts.map((a) => a.percentage), 0)
            const averageScore =
              totalAttempts > 0 ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts) : 0
            const uniqueQuizzes = new Set(attempts.map((a) => a.id)).size

            setStats({
              totalAttempts,
              averageScore,
              bestScore: Math.round(bestScore),
              totalQuizzesCompleted: uniqueQuizzes,
            })
          }
        }
      } catch (err) {
        console.error("Error fetching profile:", err)
        setError("Failed to load profile. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8 pb-8 border-b border-gray-200">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
              <User className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </div>

            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {user?.firstName || user?.emailAddresses[0]?.emailAddress || "Student"}
              </h1>
              <p className="text-gray-600 text-sm mb-4 capitalize">
                Role: <span className="font-semibold">{profile?.role}</span>
              </p>
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{profile?.email}</span>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-600 text-sm font-medium mb-1">Email Address</p>
                <p className="text-gray-900 font-semibold">{profile?.email}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-600 text-sm font-medium mb-1">Role</p>
                <p className="text-gray-900 font-semibold capitalize">{profile?.role}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <p className="text-gray-600 text-sm font-medium">Member Since</p>
                </div>
                <p className="text-gray-900 font-semibold">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "N/A"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-600 text-sm font-medium mb-1">User ID</p>
                <p className="text-gray-900 font-semibold text-xs break-all">{profile?.id}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Total Attempts</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalAttempts}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Average Score</p>
                <p className="text-3xl font-bold text-gray-900">{stats.averageScore}%</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Best Score</p>
                <p className="text-3xl font-bold text-gray-900">{stats.bestScore}%</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Award className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Quizzes Completed</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalQuizzesCompleted}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <BookOpen className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
