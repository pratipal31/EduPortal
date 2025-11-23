// app/api/update-quiz/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { quiz_id, questions, is_published } = body;

    if (!quiz_id || !questions) {
      return NextResponse.json({ error: 'Quiz ID and questions are required' }, { status: 400 });
    }

    // Update quiz publication status and total questions
    const { error: quizError } = await supabase
      .from('quizzes')
      .update({
        is_published,
        total_questions: questions.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quiz_id);

    if (quizError) {
      throw new Error(`Failed to update quiz: ${quizError.message}`);
    }

    // Delete existing questions
    const { error: deleteError } = await supabase
      .from('questions')
      .delete()
      .eq('quiz_id', quiz_id);

    if (deleteError) {
      throw new Error(`Failed to delete old questions: ${deleteError.message}`);
    }

    // Insert updated questions
    const questionsToInsert = questions.map((q: any, index: number) => ({
      quiz_id,
      question_text: q.question_text,
      question_type: q.question_type,
      difficulty: q.difficulty,
      correct_answer: q.correct_answer,
      options: q.options ? JSON.stringify(q.options) : null,
      match_pairs: q.match_pairs ? JSON.stringify(q.match_pairs) : null,
      blanks: q.blanks ? JSON.stringify(q.blanks) : null,
      points: q.points || 1,
      explanation: q.explanation || null,
      order_index: index,
    }));

    const { error: insertError } = await supabase
      .from('questions')
      .insert(questionsToInsert);

    if (insertError) {
      throw new Error(`Failed to insert updated questions: ${insertError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: is_published ? 'Quiz published successfully' : 'Quiz saved as draft',
    });

  } catch (error) {
    console.error('Error updating quiz:', error);
    return NextResponse.json({
      error: 'Failed to update quiz',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}