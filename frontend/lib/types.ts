export interface Quiz {
  id: string
  title: string
  description: string
  difficulty: string
  total_questions: number
  duration: number
  passing_score: number
  is_published: boolean
  teacher_id: string
  created_at: string
  updated_at: string
}

export interface Question {
  id?: string
  quiz_id?: string
  question_text: string
  question_type: string
  difficulty: string
  correct_answer: string
  options: string[] | null
  match_pairs: Array<{ left: string; right: string }> | null
  blanks: string[] | null
  points: number
  explanation: string
  order_index: number
}

export interface QuizAttempt {
  id: string
  quiz_id: string
  student_id: string
  score: number
  total_points: number
  percentage: number
  passed: boolean
  time_taken: number
  answers: Record<string, unknown>
  started_at: string
  completed_at: string
  status: string
}

export interface UserProfile {
  id: string
  clerk_id: string
  email: string
  role: string
  created_at: string
}

export interface StudentData {
  id: string
  email: string
  clerk_id: string
  role: string
  created_at: string
}
