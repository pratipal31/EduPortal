"use client";

import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import {
  BookOpen,
  Trophy,
  Clock,
  CheckCircle,
  TrendingUp,
  FileText,
  Target,
  Award,
  Brain,
  Activity,
  X,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  LogOut,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

interface UserProfile {
  id: string;
  clerk_id: string;
  email: string;
  role: string;
  created_at: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  total_questions: number;
  duration: number;
  passing_score: number;
  is_published: boolean;
  created_at: string;
}

interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  correct_answer: string | null;
  options: string[] | null;
  match_pairs: Array<{ left: string; right: string }> | null;
  blanks: string[] | null;
  points: number;
  explanation: string | null;
  order_index: number;
}

interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  score: number;
  total_points: number;
  percentage: number;
  passed: boolean;
  time_taken: number;
  answers: any;
  started_at: string;
  completed_at: string;
  status: string;
  quiz?: Quiz;
}

export default function StudentDashboard() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<QuizAttempt[]>([]);
  const [stats, setStats] = useState({
    totalAttempts: 0,
    averageScore: 0,
    completedQuizzes: 0,
    totalQuizzes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [attemptResult, setAttemptResult] = useState<any>(null);
  const [viewingAttempt, setViewingAttempt] = useState<QuizAttempt | null>(null);
  const [attemptQuestions, setAttemptQuestions] = useState<Question[]>([]);

  useEffect(() => {
  const fetchUserProfile = async () => {
    if (!user?.id) return;

    try {
      // First check if the user exists
      const { data: users, error: queryError } = await supabase
        .from("users")
        .select("*")
        .eq("clerk_id", user.id);

      if (queryError) {
                console.error("❌ Error querying users:", queryError);

        throw new Error(queryError.message);
      }

      // Handle no results - CREATE the user if they don't exist
      if (!users || users.length === 0) {
        console.warn(`No user profile found for clerk_id=${user.id}, creating one...`);
        
        // Create the user in the database
        const { data: newUser, error: insertError } = await supabase
          .from("users")
          .insert({
            clerk_id: user.id,
            email: user.emailAddresses[0]?.emailAddress || "",
            role: "student", // Default to student role
          })
          .select()
          .single();

        if (insertError) {
console.error("❌ Error creating user:", {
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            code: insertError.code
          });          return;
        }

                console.log("✅ User created successfully:", newUser);

        setUserProfile(newUser);
        return;
      }

      // Handle multiple results (shouldn't happen, but just in case)
      if (users.length > 1) {
        console.warn(`Multiple profiles found for clerk_id=${user.id}`);
      }

      // Take the first result
            console.log("✅ User profile loaded:", users[0]);
 
      setUserProfile(users[0]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error("Error fetching user profile:", {
        message: errorMessage,
        clerkId: user.id,
        error: err
      });
    }
  };

  if (isLoaded && user) {
    fetchUserProfile();
  }
}, [user, isLoaded]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userProfile?.id) return;

      try {
        setLoading(true);

        const { data: quizzes, error: quizzesError } = await supabase
          .from("quizzes")
          .select("*")
          .eq("is_published", true)
          .order("created_at", { ascending: false });

        if (quizzesError) throw quizzesError;

        const { data: attempts, error: attemptsError } = await supabase
          .from("quiz_attempts")
          .select(`
            *,
            quizzes (
              id,
              title,
              description,
              difficulty,
              total_questions,
              duration,
              passing_score
            )
          `)
          .eq("student_id", userProfile.id)
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(5);

        if (attemptsError) throw attemptsError;

        setAvailableQuizzes(quizzes || []);
        setRecentAttempts(attempts || []);

        const totalAttempts = attempts?.length || 0;
        const averageScore =
          totalAttempts > 0
            ? attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) /
              totalAttempts
            : 0;

        const uniqueQuizzes = new Set(
          attempts?.map((attempt) => attempt.quiz_id)
        );

        setStats({
          totalAttempts,
          averageScore: Math.round(averageScore),
          completedQuizzes: uniqueQuizzes.size,
          totalQuizzes: quizzes?.length || 0,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userProfile]);

  const startQuiz = async (quiz: Quiz) => {
    try {
      const { data: questions, error } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", quiz.id)
        .order("order_index", { ascending: true });

      if (error) throw error;

      setSelectedQuiz(quiz);
      setQuizQuestions(questions || []);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setQuizStartTime(Date.now());
      setShowResults(false);
    } catch (error) {
      console.error("Error starting quiz:", error);
      alert("Failed to load quiz questions");
    }
  };

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const submitQuiz = async () => {
    if (!selectedQuiz || !userProfile || !quizStartTime) return;

    try {
      const timeTaken = Math.floor((Date.now() - quizStartTime) / 1000);
      let totalScore = 0;
      let totalPoints = 0;

      const detailedAnswers = quizQuestions.map((question) => {
        const studentAnswer = answers[question.id];
        let isCorrect = false;
        let pointsEarned = 0;

        totalPoints += question.points;

        if (question.question_type === "multiple_choice") {
          isCorrect = studentAnswer === question.correct_answer;
          pointsEarned = isCorrect ? question.points : 0;
        } else if (question.question_type === "true_false") {
          isCorrect = studentAnswer === question.correct_answer;
          pointsEarned = isCorrect ? question.points : 0;
        } else if (question.question_type === "fill_in_blank") {
          const blanks = question.blanks || [];
          const answers = studentAnswer || [];
          isCorrect = blanks.every(
            (blank, idx) =>
              answers[idx]?.toLowerCase().trim() === blank.toLowerCase().trim()
          );
          pointsEarned = isCorrect ? question.points : 0;
        } else if (question.question_type === "match_following") {
          const pairs = question.match_pairs || [];
          const studentPairs = studentAnswer || {};
          let correctMatches = 0;
          pairs.forEach((pair) => {
            if (studentPairs[pair.left] === pair.right) {
              correctMatches++;
            }
          });
          pointsEarned = (correctMatches / pairs.length) * question.points;
          isCorrect = correctMatches === pairs.length;
        }

        totalScore += pointsEarned;

        return {
          question_id: question.id,
          student_answer: studentAnswer,
          correct_answer: question.correct_answer,
          is_correct: isCorrect,
          points_earned: pointsEarned,
          points_possible: question.points,
        };
      });

      const { data: attempt, error: attemptError } = await supabase
        .from("quiz_attempts")
        .insert({
          quiz_id: selectedQuiz.id,
          student_id: userProfile.id,
          score: totalScore,
          total_points: totalPoints,
          time_taken: timeTaken,
          answers: detailedAnswers,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (attemptError) throw attemptError;

      setAttemptResult({
        ...attempt,
        detailedAnswers,
      });
      setShowResults(true);

      const { data: updatedAttempts } = await supabase
        .from("quiz_attempts")
        .select(`
          *,
          quizzes (
            id,
            title,
            description,
            difficulty,
            total_questions,
            duration,
            passing_score
          )
        `)
        .eq("student_id", userProfile.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(5);

      if (updatedAttempts) {
        setRecentAttempts(updatedAttempts);
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      alert("Failed to submit quiz");
    }
  };

  const viewAttemptDetails = async (attempt: QuizAttempt) => {
    try {
      const questionIds = attempt.answers.map((a: any) => a.question_id);
      const { data: questions, error } = await supabase
        .from("questions")
        .select("*")
        .in("id", questionIds);

      if (error) throw error;

      setViewingAttempt(attempt);
      setAttemptQuestions(questions || []);
    } catch (error) {
      console.error("Error fetching attempt details:", error);
    }
  };

  const renderQuestion = (question: Question) => {
    const answer = answers[question.id];

    switch (question.question_type) {
      case "multiple_choice":
        // Parse options from JSON string if it's not already an array
        const options: string[] = Array.isArray(question.options) 
          ? question.options 
          : (typeof question.options === 'string' ? JSON.parse(question.options) : []);

        return (
          <div className="space-y-3">
            {options.map((option: string, idx: number) => (
              <button
                key={idx}
                onClick={() => handleAnswer(question.id, option)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                  answer === option
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <span className="font-semibold mr-2">
                  {String.fromCharCode(65 + idx)}.
                </span>
                {option}
              </button>
            ))}
          </div>
        );

      case "true_false":
        return (
          <div className="space-y-3">
            {["true", "false"].map((option) => (
              <button
                key={option}
                onClick={() => handleAnswer(question.id, option)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                  answer === option
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                {option === "true" ? "True" : "False"}
              </button>
            ))}
          </div>
        );

      case "fill_in_blank":
        return (
          <div className="space-y-3">
            {question.blanks?.map((_, idx) => (
              <input
                key={idx}
                type="text"
                placeholder={`Answer ${idx + 1}`}
                value={answer?.[idx] || ""}
                onChange={(e) => {
                  const newAnswers = [...(answer || [])];
                  newAnswers[idx] = e.target.value;
                  handleAnswer(question.id, newAnswers);
                }}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            ))}
          </div>
        );

      case "match_following":
        const leftItems = question.match_pairs?.map((p) => p.left) || [];
        const rightItems = question.match_pairs?.map((p) => p.right) || [];
        const shuffledRight = [...rightItems].sort(() => Math.random() - 0.5);

        return (
          <div className="space-y-4">
            {leftItems.map((leftItem, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="flex-1 p-3 bg-blue-50 rounded-lg font-medium">
                  {leftItem}
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
                <select
                  value={answer?.[leftItem] || ""}
                  onChange={(e) => {
                    handleAnswer(question.id, {
                      ...answer,
                      [leftItem]: e.target.value,
                    });
                  }}
                  className="flex-1 p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
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
        );

      case "short_answer":
      case "long_answer":
        return (
          <textarea
            value={answer || ""}
            onChange={(e) => handleAnswer(question.id, e.target.value)}
            placeholder="Type your answer here..."
            rows={question.question_type === "long_answer" ? 6 : 3}
            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        );

      default:
        return <p>Unsupported question type</p>;
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (viewingAttempt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Quiz Results: {viewingAttempt.quiz?.title}
              </h2>
              <button
                onClick={() => {
                  setViewingAttempt(null);
                  setAttemptQuestions([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Score</p>
                <p className="text-2xl font-bold text-blue-600">
                  {viewingAttempt.score}/{viewingAttempt.total_points}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Percentage</p>
                <p className="text-2xl font-bold text-purple-600">
                  {viewingAttempt.percentage}%
                </p>
              </div>
              <div
                className={`p-4 rounded-lg ${
                  viewingAttempt.passed ? "bg-green-50" : "bg-red-50"
                }`}
              >
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <p
                  className={`text-2xl font-bold ${
                    viewingAttempt.passed ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {viewingAttempt.passed ? "Passed" : "Failed"}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {viewingAttempt.answers.map((answer: any, idx: number) => {
                const question = attemptQuestions.find(
                  (q) => q.id === answer.question_id
                );
                if (!question) return null;

                return (
                  <div
                    key={idx}
                    className={`p-6 rounded-lg border-2 ${
                      answer.is_correct
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-gray-800 flex-1">
                        Q{idx + 1}. {question.question_text}
                      </h3>
                      {answer.is_correct ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">
                          Your Answer:{" "}
                        </span>
                        <span className="text-gray-600">
                          {JSON.stringify(answer.student_answer)}
                        </span>
                      </div>
                      {!answer.is_correct && answer.correct_answer && (
                        <div>
                          <span className="font-medium text-gray-700">
                            Correct Answer:{" "}
                          </span>
                          <span className="text-green-600">
                            {answer.correct_answer}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-gray-700">
                          Points:{" "}
                        </span>
                        <span>
                          {answer.points_earned}/{answer.points_possible}
                        </span>
                      </div>
                      {question.explanation && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <span className="font-medium text-blue-900">
                            Explanation:{" "}
                          </span>
                          <span className="text-blue-800">
                            {question.explanation}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedQuiz && !showResults) {
    const currentQuestion = quizQuestions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedQuiz.title}
                </h2>
                <p className="text-gray-600 mt-1">
                  Question {currentQuestionIndex + 1} of {quizQuestions.length}
                </p>
              </div>
              <button
                onClick={() => setSelectedQuiz(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {currentQuestion && (
              <div className="mb-8">
                <div className="flex items-start justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-800 flex-1">
                    {currentQuestion.question_text}
                  </h3>
                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold ml-4">
                    {currentQuestion.points} pts
                  </span>
                </div>
                {renderQuestion(currentQuestion)}
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={() =>
                  setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))
                }
                disabled={currentQuestionIndex === 0}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
              >
                Previous
              </button>

              {currentQuestionIndex < quizQuestions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={submitQuiz}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  Submit Quiz
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showResults && attemptResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="mb-6">
              {attemptResult.passed ? (
                <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
              ) : (
                <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
              )}
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                {attemptResult.passed
                  ? "Congratulations! 🎉"
                  : "Keep Trying! 💪"}
              </h2>
              <p className="text-gray-600">
                {attemptResult.passed
                  ? "You passed the quiz!"
                  : "You can try again to improve your score"}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 p-6 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Score</p>
                <p className="text-3xl font-bold text-blue-600">
                  {attemptResult.score}/{attemptResult.total_points}
                </p>
              </div>
              <div className="bg-purple-50 p-6 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Percentage</p>
                <p className="text-3xl font-bold text-purple-600">
                  {attemptResult.percentage}%
                </p>
              </div>
              <div className="bg-orange-50 p-6 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Time Taken</p>
                <p className="text-3xl font-bold text-orange-600">
                  {Math.floor(attemptResult.time_taken / 60)}m{" "}
                  {attemptResult.time_taken % 60}s
                </p>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setShowResults(false);
                  setSelectedQuiz(null);
                  setAttemptResult(null);
                  window.location.reload();
                }}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => {
                  viewAttemptDetails({
                    ...attemptResult,
                    quiz: selectedQuiz,
                    answers: attemptResult.detailedAnswers,
                  });
                }}
                className="px-8 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                View Detailed Results
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600 bg-green-100";
    if (percentage >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Welcome back, {user?.firstName || userProfile?.email}! 👋
              </h1>
              <p className="text-gray-600 mt-1">
                 Student Dashboard
              </p>  
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-blue-100 px-4 py-2 rounded-full">
                <Award className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900">
                  {stats.averageScore}% Avg Score
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center space-x-2 bg-red-100 hover:bg-red-200 text-red-600 px-4 py-2 rounded-full transition-colors duration-200"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-semibold">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">
                  Total Quizzes
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalQuizzes}
                </p>
              </div>
              <div className="bg-blue-100 p-4 rounded-xl">
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">
                  Completed
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.completedQuizzes}
                </p>
              </div>
              <div className="bg-green-100 p-4 rounded-xl">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">
                  Average Score
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.averageScore}%
                </p>
              </div>
              <div className="bg-purple-100 p-4 rounded-xl">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">
                  Total Attempts
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalAttempts}
                </p>
              </div>
              <div className="bg-orange-100 p-4 rounded-xl">
                <Activity className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                  <Brain className="w-6 h-6 mr-2 text-blue-600" />
                  Available Quizzes
                </h2>
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                  {availableQuizzes.length} Total
                </span>
              </div>

              <div className="space-y-4">
                {availableQuizzes.length > 0 ? (
                  availableQuizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-5 border border-blue-100 hover:shadow-md transition-all duration-300 hover:scale-[1.02]"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-gray-800">
                              {quiz.title}
                            </h3>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                quiz.difficulty === "easy"
                                  ? "bg-green-100 text-green-700"
                                  : quiz.difficulty === "medium"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : quiz.difficulty === "hard"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {quiz.difficulty}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm">
                            {quiz.description}
                          </p>
                        </div>
                        <button
                          onClick={() => startQuiz(quiz)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors duration-200 flex items-center space-x-2"
                        >
                          <Target className="w-4 h-4" />
                          <span>Start Quiz</span>
                        </button>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <FileText className="w-4 h-4 mr-1" />
                          {quiz.total_questions} Questions
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {quiz.duration} mins
                        </span>
                        <span className="flex items-center">
                          <Trophy className="w-4 h-4 mr-1" />
                          Pass: {quiz.passing_score}%
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">
                      No quizzes available at the moment
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                      Check back later for new quizzes!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <Trophy className="w-6 h-6 mr-2 text-yellow-600" />
                Recent Attempts
              </h2>

              <div className="space-y-4">
                {recentAttempts.length > 0 ? (
                  recentAttempts.map((attempt) => (
                    <div
                      key={attempt.id}
                      className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                      onClick={() => viewAttemptDetails(attempt)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-800 text-sm flex-1">
                          {attempt.quiz?.title || "Quiz"}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${getScoreColor(
                            attempt.percentage
                          )}`}
                        >
                          {attempt.percentage}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span>
                          Score: {attempt.score}/{attempt.total_points}
                        </span>
                        <span>
                          {new Date(attempt.completed_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold ${
                            attempt.passed
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {attempt.passed ? "✓ Passed" : "✗ Failed"}
                        </span>
                        <button className="text-blue-600 text-xs font-semibold hover:text-blue-700">
                          View Details →
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">
                      No attempts yet. Start a quiz to see your progress!
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg p-6 mt-6 text-white">
              <h3 className="text-lg font-bold mb-4">Your Progress</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-blue-100">Completion Rate</span>
                  <span className="font-bold">
                    {stats.totalQuizzes > 0
                      ? Math.round(
                          (stats.completedQuizzes / stats.totalQuizzes) * 100
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-white h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        stats.totalQuizzes > 0
                          ? (stats.completedQuizzes / stats.totalQuizzes) * 100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}