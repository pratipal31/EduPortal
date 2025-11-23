// app/api/get-quiz-questions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const quizId = searchParams.get('quiz_id');

    if (!quizId) {
      return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 });
    }

    // Fetch questions for the quiz
    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch questions: ${error.message}`);
    }

    // Parse JSON fields
    const parsedQuestions = questions.map((q) => ({
      ...q,
      options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : null,
      blanks: q.blanks ? (typeof q.blanks === 'string' ? JSON.parse(q.blanks) : q.blanks) : null,
      match_pairs: q.match_pairs ? (typeof q.match_pairs === 'string' ? JSON.parse(q.match_pairs) : q.match_pairs) : null,
    }));

    return NextResponse.json({
      success: true,
      questions: parsedQuestions,
    });

  } catch (error) {
    console.error('Error fetching quiz questions:', error);
    return NextResponse.json({
      error: 'Failed to fetch quiz questions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}