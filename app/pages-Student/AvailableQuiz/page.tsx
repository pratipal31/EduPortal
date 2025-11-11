"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import {
  BookOpen,
  Clock,
  Trophy,
  FileText,
  Target,
  ArrowRight,
  Loader2,
  AlertCircle,
  X,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { getSupabaseClient } from "@/lib/supabaseClient"

interface Quiz {
  id: string
  title: string
  description: string
  difficulty: string
  total_questions: number
  duration: number
  passing_score: number
  is_published: boolean
  created_at: string
}

interface Question {
  id: string
  quiz_id: string
  question_text: string
  question_type: string
  difficulty: string
  correct_answer: string | null
  options: string[] | null
  match_pairs: Array<{ left: string; right: string }> | null
  blanks: string[] | null
  points: number
  explanation: string | null
  order_index: number
}

interface AttemptStats {
  [quizId: string]: {
    attempts: number
    bestScore: number
    lastAttempt: string
  }
}

interface QuizAttempt {
  id: string
  quiz_id: string
  student_id: string
  score: number
  total_points: number
  percentage: number
  passed: boolean
  time_taken: number
  answers: any
  completed_at: string
}

export default function AvailableQuizzesPage() {
  const { user, isLoaded } = useUser()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [attemptStats, setAttemptStats] = useState<AttemptStats>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null)
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([])
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizError, setQuizError] = useState<string | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [quizStarted, setQuizStarted] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [showDetailedResults, setShowDetailedResults] = useState(false)
  const [attemptResult, setAttemptResult] = useState<QuizAttempt | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    const fetchQuizzesAndStats = async () => {
      if (!isLoaded || !user) return

      try {
        const supabase = getSupabaseClient()

        // Fetch all published quizzes
        const { data: quizzesData, error: quizzesError } = await supabase
          .from("quizzes")
          .select("*")
          .eq("is_published", true)
          .order("created_at", { ascending: false })

        if (quizzesError) throw quizzesError

        // Fetch user's attempts and profile
        const { data: userProfile, error: profileError } = await supabase
          .from("users")
          .select("id")
          .eq("clerk_id", user.id)
          .single()

        if (!profileError && userProfile) {
          setUserProfile(userProfile)
          const { data: attemptsData } = await supabase
            .from("quiz_attempts")
            .select("quiz_id, score, total_points, completed_at")
            .eq("student_id", userProfile.id)
            .eq("status", "completed")

          if (attemptsData) {
            const stats: AttemptStats = {}
            attemptsData.forEach(
              (attempt: Pick<QuizAttempt, "quiz_id" | "score" | "total_points" | "completed_at">) => {
                if (!stats[attempt.quiz_id]) {
                  stats[attempt.quiz_id] = {
                    attempts: 0,
                    bestScore: 0,
                    lastAttempt: "",
                  }
                }
                stats[attempt.quiz_id].attempts++
                const score = (attempt.score / attempt.total_points) * 100
                if (score > stats[attempt.quiz_id].bestScore) {
                  stats[attempt.quiz_id].bestScore = score
                }
                stats[attempt.quiz_id].lastAttempt = attempt.completed_at
              },
            )
            setAttemptStats(stats)
          }
        }

        setQuizzes(quizzesData || [])
      } catch (err) {
        console.error("Error fetching quizzes:", err)
        setError("Failed to load quizzes. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchQuizzesAndStats()
  }, [user, isLoaded])

  useEffect(() => {
    if (!quizStarted || !selectedQuiz || !startTime) return

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      const totalSeconds = selectedQuiz.duration * 60
      const remaining = totalSeconds - elapsed

      if (remaining <= 0) {
        handleSubmitQuiz()
        clearInterval(interval)
      } else {
        setTimeLeft(remaining)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [quizStarted, selectedQuiz, startTime])

  const fetchAttemptStats = async () => {
    if (!user || !userProfile) return

    try {
      const supabase = getSupabaseClient()
      const { data: attemptsData } = await supabase
        .from("quiz_attempts")
        .select("quiz_id, score, total_points, completed_at")
        .eq("student_id", userProfile.id)
        .eq("status", "completed")

      if (attemptsData) {
        const stats: AttemptStats = {}
        attemptsData.forEach((attempt: Pick<QuizAttempt, "quiz_id" | "score" | "total_points" | "completed_at">) => {
          if (!stats[attempt.quiz_id]) {
            stats[attempt.quiz_id] = {
              attempts: 0,
              bestScore: 0,
              lastAttempt: "",
            }
          }
          stats[attempt.quiz_id].attempts++
          const score = (attempt.score / attempt.total_points) * 100
          if (score > stats[attempt.quiz_id].bestScore) {
            stats[attempt.quiz_id].bestScore = score
          }
          stats[attempt.quiz_id].lastAttempt = attempt.completed_at
        })
        setAttemptStats(stats)
      }
    } catch (err) {
      console.error("Error fetching attempt stats:", err)
    }
  }

  const handleSelectQuiz = async (quiz: Quiz) => {
    setSelectedQuiz(quiz)
    setSelectedQuizId(quiz.id)
    setQuizLoading(true)
    setQuizError(null)

    try {
      const supabase = getSupabaseClient()
      const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", quiz.id)
        .order("order_index", { ascending: true })

      if (questionsError) throw questionsError

      setQuizQuestions(questions || [])
      setCurrentQuestionIndex(0)
      setAnswers({})
      setQuizStarted(false)
      setShowResults(false)
      setShowDetailedResults(false)

      // Refresh attempt stats after selecting a quiz
      await fetchAttemptStats()
    } catch (err) {
      console.error("Error loading quiz:", err)
      setQuizError("Failed to load quiz questions. Please try again.")
    } finally {
      setQuizLoading(false)
    }
  }

  const handleStartQuiz = () => {
    setQuizStarted(true)
    setStartTime(Date.now())
    setTimeLeft((selectedQuiz?.duration ?? 30) * 60)
  }

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }))
  }

  const handleSubmitQuiz = async () => {
    if (!selectedQuiz || !userProfile || !startTime) return

    try {
      const supabase = getSupabaseClient()
      const timeTaken = Math.floor((Date.now() - startTime) / 1000)
      let totalScore = 0
      let totalPoints = 0

      const detailedAnswers = quizQuestions.map((question) => {
        const studentAnswer = answers[question.id]
        let isCorrect = false
        let pointsEarned = 0

        totalPoints += question.points

        if (question.question_type === "multiple_choice" || question.question_type === "true_false") {
          isCorrect = studentAnswer === question.correct_answer
          pointsEarned = isCorrect ? question.points : 0
        } else if (question.question_type === "fill_in_blank") {
          const blanks = question.blanks || []
          const studentAnswers = studentAnswer || []
          isCorrect = blanks.every(
            (blank, idx) => studentAnswers[idx]?.toLowerCase().trim() === blank.toLowerCase().trim(),
          )
          pointsEarned = isCorrect ? question.points : 0
        } else if (question.question_type === "match_following") {
          const pairs = question.match_pairs || []
          const studentPairs = studentAnswer || {}
          let correctMatches = 0
          pairs.forEach((pair) => {
            if (studentPairs[pair.left] === pair.right) {
              correctMatches++
            }
          })
          pointsEarned = (correctMatches / pairs.length) * question.points
          isCorrect = correctMatches === pairs.length
        } else if (question.question_type === "short_answer" || question.question_type === "long_answer") {
          // Instructors will need to manually grade these answers for correctness
          isCorrect = studentAnswer && studentAnswer.trim().length > 0
          pointsEarned = isCorrect ? question.points : 0
        }

        totalScore += pointsEarned

        return {
          question_id: question.id,
          student_answer: studentAnswer,
          correct_answer: question.correct_answer,
          is_correct: isCorrect,
          points_earned: pointsEarned,
          points_possible: question.points,
        }
      })

      const percentage = Math.round((totalScore / totalPoints) * 100)

      const { data: attempt, error: attemptError } = await supabase
        .from("quiz_attempts")
        .insert({
          quiz_id: selectedQuiz.id,
          student_id: userProfile.id,
          score: totalScore,
          total_points: totalPoints,
          percentage,
          passed: percentage >= selectedQuiz.passing_score,
          time_taken: timeTaken,
          answers: detailedAnswers,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (attemptError) throw attemptError

      setAttemptResult(attempt)
      setShowResults(true)

      // Refresh attempt stats after submission
      await fetchAttemptStats()
    } catch (err) {
      console.error("Error submitting quiz:", err)
      setQuizError("Failed to submit quiz. Please try again.")
    }
  }

  const renderQuestion = (question: Question) => {
    const answer = answers[question.id]

    switch (question.question_type) {
      case "multiple_choice":
        const options: string[] = Array.isArray(question.options)
          ? question.options
          : typeof question.options === "string"
            ? JSON.parse(question.options)
            : []

        return (
          <div className="space-y-2 sm:space-y-3">
            {options.map((option: string, idx: number) => (
              <button
                key={idx}
                onClick={() => handleAnswer(question.id, option)}
                className={`w-full text-left p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 text-xs sm:text-base ${
                  answer === option
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                }`}
              >
                <span className="font-semibold mr-2 sm:mr-3 text-gray-700">{String.fromCharCode(65 + idx)}.</span>
                <span>{option}</span>
              </button>
            ))}
          </div>
        )

      case "true_false":
        return (
          <div className="space-y-2 sm:space-y-3">
            {["true", "false"].map((option) => (
              <button
                key={option}
                onClick={() => handleAnswer(question.id, option)}
                className={`w-full text-left p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 font-medium text-xs sm:text-base ${
                  answer === option
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                }`}
              >
                {option === "true" ? "✓ True" : "✗ False"}
              </button>
            ))}
          </div>
        )

      case "fill_in_blank":
        return (
          <div className="space-y-2 sm:space-y-3">
            {question.blanks?.map((_, idx) => (
              <input
                key={idx}
                type="text"
                placeholder={`Answer ${idx + 1}`}
                value={answer?.[idx] || ""}
                onChange={(e) => {
                  const newAnswers = [...(answer || [])]
                  newAnswers[idx] = e.target.value
                  handleAnswer(question.id, newAnswers)
                }}
                className="w-full p-2 sm:p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-xs sm:text-base"
              />
            ))}
          </div>
        )

      case "match_following":
        const leftItems = question.match_pairs?.map((p) => p.left) || []
        const rightItems = question.match_pairs?.map((p) => p.right) || []
        const shuffledRight = [...rightItems].sort(() => Math.random() - 0.5)

        return (
          <div className="space-y-2 sm:space-y-4">
            {leftItems.map((leftItem, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                <div className="flex-1 p-2 sm:p-3 bg-blue-50 rounded-lg font-medium text-xs sm:text-base border border-blue-200">
                  {leftItem}
                </div>
                <div className="hidden sm:flex text-gray-400 flex-shrink-0">→</div>
                <select
                  value={answer?.[leftItem] || ""}
                  onChange={(e) => {
                    handleAnswer(question.id, {
                      ...answer,
                      [leftItem]: e.target.value,
                    })
                  }}
                  className="flex-1 p-2 sm:p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-xs sm:text-base"
                >
                  <option value="">Select match...</option>
                  {shuffledRight.map((rightItem, ridx) => (
                    <option key={ridx} value={rightItem}>
                      {rightItem}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )

      case "short_answer":
        return (
          <textarea
            placeholder="Enter your answer here..."
            value={answer || ""}
            onChange={(e) => handleAnswer(question.id, e.target.value)}
            className="w-full p-3 sm:p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-xs sm:text-base resize-none h-24"
          />
        )

      case "long_answer":
        return (
          <textarea
            placeholder="Enter your detailed answer here..."
            value={answer || ""}
            onChange={(e) => handleAnswer(question.id, e.target.value)}
            className="w-full p-3 sm:p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-xs sm:text-base resize-none h-40"
          />
        )

      default:
        return <p className="text-gray-500 text-xs sm:text-base">Unsupported question type</p>
    }
  }

  const renderDetailedResults = () => {
    if (!attemptResult) return null

    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-blue-50 rounded-lg p-3 sm:p-6 border border-blue-100">
            <p className="text-gray-600 text-xs font-medium mb-1">Score</p>
            <p className="text-lg sm:text-2xl font-bold text-blue-600">
              {Math.round(attemptResult.score)}/{attemptResult.total_points}
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 sm:p-6 border border-purple-100">
            <p className="text-gray-600 text-xs font-medium mb-1">%</p>
            <p className="text-lg sm:text-2xl font-bold text-purple-600">{attemptResult.percentage}%</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 sm:p-6 border border-orange-100">
            <p className="text-gray-600 text-xs font-medium mb-1">Time</p>
            <p className="text-lg sm:text-2xl font-bold text-orange-600">
              {Math.floor(attemptResult.time_taken / 60)}m
            </p>
          </div>
        </div>

        {/* Questions Review */}
        <div className="space-y-4 sm:space-y-6">
          <h3 className="text-base sm:text-xl font-bold text-gray-900">Review Answers</h3>
          {attemptResult.answers?.map((answerData: any, idx: number) => {
            const question = quizQuestions.find((q) => q.id === answerData.question_id)
            if (!question) return null

            return (
              <div
                key={idx}
                className={`rounded-lg border-2 p-4 sm:p-6 ${
                  answerData.is_correct ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                }`}
              >
                {/* Question Header */}
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 sm:gap-3 mb-2">
                      <span className="text-xs sm:text-sm font-bold text-gray-600 flex-shrink-0">Q{idx + 1}.</span>
                      <p className="text-xs sm:text-base font-semibold text-gray-900">{question.question_text}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {answerData.is_correct ? (
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                    )}
                    <span className="text-xs sm:text-sm font-bold">
                      {Math.round(answerData.points_earned)}/{answerData.points_possible} pts
                    </span>
                  </div>
                </div>

                {/* Answer Details */}
                <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-4">
                  <div className="bg-white rounded p-3 sm:p-4 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Your Answer:</p>
                    <p className="text-xs sm:text-sm text-gray-900">
                      {Array.isArray(answerData.student_answer)
                        ? answerData.student_answer.join(", ")
                        : typeof answerData.student_answer === "object"
                          ? Object.entries(answerData.student_answer)
                              .map(([key, value]) => `${key} → ${value}`)
                              .join("; ")
                          : answerData.student_answer || "Not answered"}
                    </p>
                  </div>

                  {!answerData.is_correct && (
                    <div className="bg-white rounded p-3 sm:p-4 border border-gray-200">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Correct Answer:</p>
                      <p className="text-xs sm:text-sm text-green-700 font-medium">
                        {Array.isArray(answerData.correct_answer)
                          ? answerData.correct_answer.join(", ")
                          : answerData.correct_answer}
                      </p>
                    </div>
                  )}
                </div>

                {/* Explanation */}
                {question.explanation && (
                  <div className="bg-white rounded p-3 sm:p-4 border-l-4 border-l-blue-500 border border-gray-200">
                    <p className="text-xs font-semibold text-blue-600 mb-2">💡 Explanation:</p>
                    <p className="text-xs sm:text-sm text-gray-700">{question.explanation}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Action Button */}
        <button
          onClick={closeQuizModal}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors text-xs sm:text-base mt-6 sm:mt-8"
        >
          Back to Quizzes
        </button>
      </div>
    )
  }

  const closeQuizModal = () => {
    setSelectedQuizId(null)
    setSelectedQuiz(null)
    setQuizQuestions([])
    setCurrentQuestionIndex(0)
    setAnswers({})
    setQuizStarted(false)
    setShowResults(false)
    setShowDetailedResults(false)
    setAttemptResult(null)
    setTimeLeft(null)
    setQuizError(null)
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "bg-green-100 text-green-700 border-green-200"
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "hard":
        return "bg-orange-100 text-orange-700 border-orange-200"
      case "advanced":
        return "bg-red-100 text-red-700 border-red-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12">
        {/* Header Section */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2 sm:mb-3 text-balance">
            Available Quizzes
          </h1>
          <p className="text-gray-600 text-xs sm:text-base lg:text-lg max-w-2xl text-pretty">
            Choose a quiz to test your knowledge and improve your skills
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-xs sm:text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl p-5 sm:p-6 animate-pulse shadow-sm border border-gray-100">
                <div className="h-6 bg-gray-200 rounded mb-4 w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded mb-4 w-full"></div>
                <div className="h-4 bg-gray-200 rounded mb-6 w-2/3"></div>
                <div className="flex gap-3">
                  <div className="h-9 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-9 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="text-center py-12 sm:py-20">
            <BookOpen className="w-12 sm:w-16 h-12 sm:h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-base sm:text-lg font-medium mb-2">No quizzes available</p>
            <p className="text-gray-400 text-xs sm:text-sm">Check back later for new quizzes!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 auto-rows-max">
            {quizzes.map((quiz) => {
              const stats = attemptStats[quiz.id]
              return (
                <div
                  key={quiz.id}
                  className="group flex flex-col bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-200 h-full"
                >
                  <div className="p-4 sm:p-6 flex flex-col h-full">
                    {/* Title and Difficulty */}
                    <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3 min-h-[56px]">
                      <h3 className="text-sm sm:text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 flex-1">
                        {quiz.title}
                      </h3>
                      <span
                        className={`px-2 sm:px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap border flex-shrink-0 ${getDifficultyColor(quiz.difficulty)}`}
                      >
                        {quiz.difficulty}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 text-xs sm:text-sm mb-4 line-clamp-2 flex-shrink-0">
                      {quiz.description}
                    </p>

                    {/* Quiz Info */}
                    <div className="space-y-2 mb-6 flex-shrink-0">
                      <div className="flex items-center gap-2 text-gray-600 text-xs sm:text-sm">
                        <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span>{quiz.total_questions} Questions</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 text-xs sm:text-sm">
                        <Clock className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <span>{quiz.duration} min</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 text-xs sm:text-sm">
                        <Trophy className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>Pass: {quiz.passing_score}%</span>
                      </div>
                    </div>

                    {/* Attempt Stats */}
                    {stats && (
                      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-3 sm:p-4 mb-6 border border-blue-100">
                        <p className="text-xs text-gray-600 font-medium mb-2 sm:mb-3">Your Performance</p>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                          <div className="text-center">
                            <p className="text-lg sm:text-2xl font-bold text-blue-600">{stats.attempts}</p>
                            <p className="text-xs text-gray-600 mt-1">Attempts</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg sm:text-2xl font-bold text-green-600">
                              {Math.round(stats.bestScore)}%
                            </p>
                            <p className="text-xs text-gray-600 mt-1">Best</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => handleSelectQuiz(quiz)}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group/btn mt-auto text-xs sm:text-sm"
                    >
                      <Target className="w-4 h-4" />
                      <span>{stats ? "Retake Quiz" : "Start Quiz"}</span>
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedQuizId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-3 sm:p-6 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-2xl font-bold text-gray-900 truncate">{selectedQuiz?.title}</h2>
              </div>
              <button
                onClick={closeQuizModal}
                className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-8">
              {quizLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
                  <span className="text-gray-600 text-xs sm:text-base">Loading quiz...</span>
                </div>
              ) : quizError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-xs sm:text-sm">{quizError}</p>
                </div>
              ) : showDetailedResults ? (
                renderDetailedResults()
              ) : showResults && attemptResult ? (
                // Results screen with option to view detailed results
                <div className="text-center">
                  <div className="mb-6 sm:mb-8">
                    {attemptResult.passed ? (
                      <CheckCircle2 className="w-14 sm:w-20 h-14 sm:h-20 text-green-500 mx-auto mb-3 sm:mb-4" />
                    ) : (
                      <XCircle className="w-14 sm:w-20 h-14 sm:h-20 text-red-500 mx-auto mb-3 sm:mb-4" />
                    )}
                    <h3 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2">
                      {attemptResult.passed ? "Congratulations!" : "Keep Trying!"}
                    </h3>
                    <p className="text-gray-600 text-xs sm:text-base">
                      {attemptResult.passed ? "You passed the quiz!" : "You can try again to improve your score"}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
                    <div className="bg-blue-50 rounded-lg p-3 sm:p-6 border border-blue-100">
                      <p className="text-gray-600 text-xs font-medium mb-1">Score</p>
                      <p className="text-lg sm:text-2xl font-bold text-blue-600">
                        {Math.round(attemptResult.score)}/{attemptResult.total_points}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 sm:p-6 border border-purple-100">
                      <p className="text-gray-600 text-xs font-medium mb-1">%</p>
                      <p className="text-lg sm:text-2xl font-bold text-purple-600">{attemptResult.percentage}%</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 sm:p-6 border border-orange-100">
                      <p className="text-gray-600 text-xs font-medium mb-1">Time</p>
                      <p className="text-lg sm:text-2xl font-bold text-orange-600">
                        {Math.floor(attemptResult.time_taken / 60)}m
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={closeQuizModal}
                      className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-xs sm:text-base"
                    >
                      Back to Quizzes
                    </button>
                    <button
                      onClick={() => setShowDetailedResults(true)}
                      className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors text-xs sm:text-base"
                    >
                      Review Answers
                    </button>
                  </div>
                </div>
              ) : !quizStarted && selectedQuiz ? (
                <div>
                  <p className="text-gray-600 text-xs sm:text-base mb-6 sm:mb-8">{selectedQuiz.description}</p>

                  <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 space-y-3 sm:space-y-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-medium text-xs sm:text-base">Total Questions</span>
                      <span className="text-lg sm:text-2xl font-bold text-gray-900">
                        {selectedQuiz.total_questions}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-medium text-xs sm:text-base">Duration</span>
                      <span className="text-lg sm:text-2xl font-bold text-gray-900">{selectedQuiz.duration} min</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-medium text-xs sm:text-base">Pass Score</span>
                      <span className="text-lg sm:text-2xl font-bold text-gray-900">{selectedQuiz.passing_score}%</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-6 sm:mb-8">
                    <p className="text-blue-900 text-xs sm:text-sm">
                      <strong>Note:</strong> Once you start, you will have {selectedQuiz.duration} minutes to complete
                      it.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={closeQuizModal}
                      className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-xs sm:text-base"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleStartQuiz}
                      className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all text-xs sm:text-base"
                    >
                      Start Quiz
                    </button>
                  </div>
                </div>
              ) : quizStarted && quizQuestions.length > 0 ? (
                <div>
                  {/* Quiz Progress Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="w-full sm:flex-1">
                      <p className="text-gray-600 text-xs sm:text-sm">
                        Question {currentQuestionIndex + 1} of {quizQuestions.length}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mt-2">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-purple-600 h-full transition-all duration-300"
                          style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div
                      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full font-semibold text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                        (timeLeft || 0) < 300 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      <span>
                        {String(Math.floor((timeLeft || 0) / 60)).padStart(2, "0")}:
                        {String((timeLeft || 0) % 60).padStart(2, "0")}
                      </span>
                    </div>
                  </div>

                  {/* Question */}
                  {quizQuestions[currentQuestionIndex] && (
                    <div className="mb-6 sm:mb-8">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
                        <h3 className="text-sm sm:text-lg font-semibold text-gray-900 flex-1">
                          {quizQuestions[currentQuestionIndex].question_text}
                        </h3>
                        <span className="bg-purple-100 text-purple-700 px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0">
                          {quizQuestions[currentQuestionIndex].points} pts
                        </span>
                      </div>
                      {renderQuestion(quizQuestions[currentQuestionIndex])}
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                    <button
                      onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentQuestionIndex === 0}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors text-xs sm:text-base"
                    >
                      Previous
                    </button>

                    <div className="flex-1 text-center text-gray-600 text-xs sm:text-sm">
                      {currentQuestionIndex + 1} / {quizQuestions.length}
                    </div>

                    {currentQuestionIndex < quizQuestions.length - 1 ? (
                      <button
                        onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                        className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors text-xs sm:text-base"
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmitQuiz}
                        className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors text-xs sm:text-base"
                      >
                        Submit
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
