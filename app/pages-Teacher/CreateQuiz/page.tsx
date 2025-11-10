"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { getSupabaseClient } from "@/lib/supabaseClient"
import { generateExplanation } from "@/lib/groq-api"
import type { Question } from "@/lib/types"
import { Plus, Trash2, Save, Loader, Sparkles } from "lucide-react"

export default function CreateQuizPage() {
  const { user, isLoaded } = useUser()
  const supabase = getSupabaseClient()

  const [loading, setLoading] = useState(false)
  const [generatingExplanation, setGeneratingExplanation] = useState(false)
  const [quizForm, setQuizForm] = useState({
    title: "",
    description: "",
    difficulty: "easy",
    duration: 30,
    passing_score: 60,
    is_published: false,
  })

  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    question_text: "",
    question_type: "multiple_choice",
    difficulty: "easy",
    correct_answer: "",
    options: ["", "", "", ""],
    match_pairs: null,
    blanks: null,
    points: 1,
    explanation: "",
    order_index: 0,
  })

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

  const handleAddQuestion = () => {
    // Basic validation for all question types
    if (!currentQuestion.question_text.trim()) {
      alert("Please fill in the question text")
      return
    }

    // Type-specific validation
    if (currentQuestion.question_type === "multiple_choice") {
      if (!currentQuestion.options?.every(option => option.trim())) {
        alert("Please fill in all four options for multiple choice question")
        return
      }
      if (!currentQuestion.correct_answer) {
        alert("Please select the correct answer for multiple choice question")
        return
      }
    } else if (currentQuestion.question_type === "true_false") {
      if (!currentQuestion.correct_answer) {
        alert("Please select true or false as the correct answer")
        return
      }
    } else if (currentQuestion.question_type === "fill_in_blank") {
      if (!currentQuestion.blanks?.some(blank => blank.trim())) {
        alert("Please provide at least one answer for fill in the blank")
        return
      }
      currentQuestion.correct_answer = JSON.stringify(currentQuestion.blanks)
    } else if (!currentQuestion.correct_answer.trim()) {
      alert("Please provide the correct answer")
      return
    }

    setQuestions([...questions, { ...currentQuestion, order_index: questions.length }])
    setCurrentQuestion({
      question_text: "",
      question_type: "multiple_choice",
      difficulty: "easy",
      correct_answer: "",
      options: ["", "", "", ""],
      match_pairs: null,
      blanks: null,
      points: 1,
      explanation: "",
      order_index: 0,
    })
  }

  const handleGenerateExplanation = async () => {
    if (!currentQuestion.question_text || !currentQuestion.correct_answer) {
      alert("Please fill in question and correct answer first")
      return
    }

    setGeneratingExplanation(true)
    try {
      const explanation = await generateExplanation(
        currentQuestion.question_text,
        currentQuestion.correct_answer,
        currentQuestion.question_type,
      )
      setCurrentQuestion({ ...currentQuestion, explanation })
    } catch (error) {
      console.error("Error:", error)
      alert("Failed to generate explanation")
    } finally {
      setGeneratingExplanation(false)
    }
  }

  const handleCreateQuiz = async () => {
    if (!userProfile?.id || !quizForm.title || questions.length === 0) {
      alert("Please fill in all required fields and add at least one question")
      return
    }

    setLoading(true)
    try {
      // Create quiz
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          ...quizForm,
          teacher_id: userProfile.id,
          total_questions: questions.length,
        })
        .select()
        .single()

      if (quizError) throw quizError

      // Insert questions
      const questionsToInsert = questions.map((q) => ({
        quiz_id: quizData.id,
        question_text: q.question_text,
        question_type: q.question_type,
        difficulty: q.difficulty,
        correct_answer: q.correct_answer,
        options: q.options ? JSON.stringify(q.options) : null,
        match_pairs: q.match_pairs ? JSON.stringify(q.match_pairs) : null,
        blanks: q.blanks ? JSON.stringify(q.blanks) : null,
        points: q.points,
        explanation: q.explanation,
        order_index: q.order_index,
      }))

      const { error: questionsError } = await supabase.from("questions").insert(questionsToInsert)

      if (questionsError) throw questionsError

      alert("Quiz created successfully!")
      setQuizForm({
        title: "",
        description: "",
        difficulty: "easy",
        duration: 30,
        passing_score: 60,
        is_published: false,
      })
      setQuestions([])
    } catch (error) {
      console.error("Error creating quiz:", error)
      alert("Failed to create quiz")
    } finally {
      setLoading(false)
    }
  }

  const renderQuestionForm = () => {
    switch (currentQuestion.question_type) {
      case "multiple_choice":
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              <label className="block text-sm font-medium">Options (4 required)</label>
              {currentQuestion.options?.map((option, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={currentQuestion.correct_answer === option}
                    onChange={() => setCurrentQuestion({ ...currentQuestion, correct_answer: option })}
                    disabled={!option.trim()}
                    className="w-4 h-4"
                  />
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...(currentQuestion.options || [])]
                      newOptions[idx] = e.target.value
                      // If this was the correct answer and it's now empty, clear the correct answer
                      if (currentQuestion.correct_answer === option && !e.target.value.trim()) {
                        setCurrentQuestion({ 
                          ...currentQuestion, 
                          options: newOptions,
                          correct_answer: ""
                        })
                      } else {
                        setCurrentQuestion({ ...currentQuestion, options: newOptions })
                      }
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500">Select the radio button next to the correct answer</p>
          </div>
        )
      case "true_false":
        return (
          <div>
            <label className="block text-sm font-medium mb-2">Correct Answer</label>
            <select
              value={currentQuestion.correct_answer}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, correct_answer: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select answer</option>
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          </div>
        )
      case "fill_in_blank":
        return (
          <div>
            <label className="block text-sm font-medium mb-2">Correct Answers</label>
            <div className="space-y-2">
              {(currentQuestion.blanks || [""]).map((blank, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={blank}
                  onChange={(e) => {
                    const newBlanks = [...(currentQuestion.blanks || [""])]
                    newBlanks[idx] = e.target.value
                    setCurrentQuestion({ ...currentQuestion, blanks: newBlanks })
                  }}
                  placeholder={`Answer for blank ${idx + 1}`}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              ))}
            </div>
          </div>
        )
      default:
        return (
          <div>
            <label className="block text-sm font-medium mb-2">Correct Answer</label>
            <textarea
              value={currentQuestion.correct_answer}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, correct_answer: e.target.value })}
              rows={2}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )
    }
  }

  if (!isLoaded) return <div className="flex items-center justify-center min-h-screen">Loading...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Create New Quiz
          </h1>
          <p className="text-gray-600 mt-2">Design your quiz with questions and AI-generated explanations</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quiz Details Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 sticky top-6">
              <h2 className="text-xl font-bold mb-4">Quiz Details</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <input
                    type="text"
                    value={quizForm.title}
                    onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                    placeholder="Quiz title"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={quizForm.description}
                    onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                    placeholder="Quiz description"
                    rows={3}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Difficulty</label>
                  <select
                    value={quizForm.difficulty}
                    onChange={(e) => setQuizForm({ ...quizForm, difficulty: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">Duration (min)</label>
                    <input
                      type="number"
                      value={quizForm.duration}
                      onChange={(e) => setQuizForm({ ...quizForm, duration: Number.parseInt(e.target.value) })}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Pass Score (%)</label>
                    <input
                      type="number"
                      value={quizForm.passing_score}
                      onChange={(e) => setQuizForm({ ...quizForm, passing_score: Number.parseInt(e.target.value) })}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="publish"
                    checked={quizForm.is_published}
                    onChange={(e) => setQuizForm({ ...quizForm, is_published: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="publish" className="text-sm">
                    Publish immediately
                  </label>
                </div>

                <button
                  onClick={handleCreateQuiz}
                  disabled={loading || questions.length === 0}
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center space-x-2 font-semibold mt-6"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>Create Quiz</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Questions Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Add Question Form */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-xl font-bold mb-4">Add Question</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Question Text *</label>
                  <textarea
                    value={currentQuestion.question_text}
                    onChange={(e) =>
                      setCurrentQuestion({
                        ...currentQuestion,
                        question_text: e.target.value,
                      })
                    }
                    placeholder="Enter your question..."
                    rows={3}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select
                      value={currentQuestion.question_type}
                      onChange={(e) =>
                        setCurrentQuestion({
                          ...currentQuestion,
                          question_type: e.target.value,
                          options: e.target.value === "multiple_choice" ? ["", "", "", ""] : null,
                          blanks: e.target.value === "fill_in_blank" ? [""] : null,
                        })
                      }
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="true_false">True/False</option>
                      <option value="fill_in_blank">Fill Blank</option>
                      <option value="short_answer">Short Answer</option>
                      <option value="long_answer">Long Answer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Difficulty</label>
                    <select
                      value={currentQuestion.difficulty}
                      onChange={(e) =>
                        setCurrentQuestion({
                          ...currentQuestion,
                          difficulty: e.target.value,
                        })
                      }
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Points</label>
                    <input
                      type="number"
                      value={currentQuestion.points}
                      onChange={(e) =>
                        setCurrentQuestion({
                          ...currentQuestion,
                          points: Number.parseInt(e.target.value) || 1,
                        })
                      }
                      min="1"
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {renderQuestionForm()}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">Explanation</label>
                    <button
                      onClick={handleGenerateExplanation}
                      disabled={generatingExplanation}
                      className="flex items-center space-x-1 text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Generate with AI</span>
                    </button>
                  </div>
                  <textarea
                    value={currentQuestion.explanation}
                    onChange={(e) =>
                      setCurrentQuestion({
                        ...currentQuestion,
                        explanation: e.target.value,
                      })
                    }
                    placeholder="Or enter explanation manually..."
                    rows={2}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  onClick={handleAddQuestion}
                  className="w-full bg-indigo-100 text-indigo-700 py-2 rounded-lg hover:bg-indigo-200 flex items-center justify-center space-x-2 font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Question</span>
                </button>
              </div>
            </div>

            {/* Questions List */}
            {questions.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h2 className="text-xl font-bold mb-4">Questions ({questions.length})</h2>
                <div className="space-y-3">
                  {questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800">
                            Q{idx + 1}. {q.question_text}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                              {q.question_type.replace("_", " ")}
                            </span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-semibold">
                              {q.difficulty}
                            </span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
                              {q.points} pts
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => setQuestions(questions.filter((_, i) => i !== idx))}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
