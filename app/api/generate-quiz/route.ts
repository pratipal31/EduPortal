// app/api/generate-quiz/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import Groq from 'groq-sdk';
import { generateHuggingFaceEmbedding } from '@/lib/embeddings';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface QuizConfig {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'advanced';
  questionTypes: string[];
  numQuestions: number;
  duration: number;
  passingScore: number;
  documentIds?: string[];
}

export async function POST(req: NextRequest) {
  try {
    // Use await with auth() to get userId
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (!userData) {
      return NextResponse.json({ 
        error: 'User not found in database' 
      }, { status: 404 });
    }

    const config: QuizConfig = await req.json();

    console.log('Generating quiz with config:', config);

    // Step 1: Get relevant context from document chunks using RAG
    const contextQuery = `${config.title} ${config.description}`;
    const queryEmbedding = await generateHuggingFaceEmbedding(contextQuery);

    console.log('Generated query embedding');

    // Format embedding as PostgreSQL vector string
    const vectorString = `[${queryEmbedding.join(',').replace(/\s/g, '')}]`;

    // Search for relevant chunks
    const { data: relevantChunks, error: searchError } = await supabase
      .rpc('vector_search_chunks', {
        query_embedding: vectorString,
        match_count: 5
      });

    if (searchError) {
      console.error('Search error:', searchError);
    }

    // Combine relevant chunks into context
    const context = relevantChunks
      ?.map((chunk: any) => chunk.chunk_text)
      .join('\n\n') || 'No specific context available. Generate general questions on the topic.';

    console.log('Context length:', context.length);

    // Step 2: Generate quiz using Groq with context
    const prompt = `You are an expert quiz generator. Generate a quiz based on the following context and requirements.

CONTEXT FROM DOCUMENTS:
${context}

QUIZ REQUIREMENTS:
- Title: ${config.title}
- Description: ${config.description}
- Difficulty: ${config.difficulty}
- Number of questions: ${config.numQuestions}
- Question types to include: ${config.questionTypes.join(', ')}

Generate exactly ${config.numQuestions} questions. For each question, provide:
1. Question text
2. Question type (one of: ${config.questionTypes.join(', ')})
3. Correct answer
4. For multiple_choice: 4 options (one correct)
5. For fill_in_blank: the blank answers as an array
6. For match_following: pairs of items to match
7. Points (1-5 based on difficulty)
8. Explanation of the answer

Return ONLY a valid JSON object with this structure:
{
  "questions": [
    {
      "question_text": "string",
      "question_type": "multiple_choice|fill_in_blank|true_false|short_answer|long_answer|match_following",
      "difficulty": "easy|medium|hard|advanced",
      "correct_answer": "string",
      "options": ["option1", "option2", "option3", "option4"],
      "blanks": ["blank1", "blank2"],
      "match_pairs": [{"left": "item1", "right": "match1"}],
      "points": 1-5,
      "explanation": "string"
    }
  ]
}`;

    console.log('Calling Groq API...');

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a quiz generator that returns only valid JSON. Never include markdown code blocks or explanations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 8000,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    console.log('Groq response received, length:', responseText.length);
    
    // Clean the response to extract JSON
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }
    
    const generatedQuestions = JSON.parse(jsonText);
    console.log('Parsed questions:', generatedQuestions.questions.length);

    // Step 3: Create quiz in database
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        title: config.title,
        description: config.description,
        difficulty: config.difficulty,
        duration: config.duration,
        passing_score: config.passingScore,
        teacher_id: userData.id,
        is_published: false,
      })
      .select()
      .single();

    if (quizError) {
      console.error('Quiz creation error:', quizError);
      throw new Error(`Failed to create quiz: ${quizError.message}`);
    }

    console.log('Quiz created:', quiz.id);

    // Step 4: Insert questions
    const questionsToInsert = generatedQuestions.questions.map((q: any, index: number) => ({
      quiz_id: quiz.id,
      question_text: q.question_text,
      question_type: q.question_type,
      difficulty: q.difficulty || config.difficulty,
      correct_answer: q.correct_answer || null,
      options: q.options ? q.options : null,
      match_pairs: q.match_pairs ? q.match_pairs : null,
      blanks: q.blanks ? q.blanks : null,
      points: q.points || 1,
      explanation: q.explanation || null,
      order_index: index,
    }));

    const { error: questionsError } = await supabase
      .from('questions')
      .insert(questionsToInsert);

    if (questionsError) {
      console.error('Questions insertion error:', questionsError);
      // Rollback: delete the quiz if questions fail
      await supabase.from('quizzes').delete().eq('id', quiz.id);
      throw new Error(`Failed to insert questions: ${questionsError.message}`);
    }

    console.log('Questions inserted successfully');

    return NextResponse.json({
      success: true,
      quiz_id: quiz.id,
      message: 'Quiz generated successfully',
      questions_count: questionsToInsert.length,
    });

  } catch (error) {
    console.error('Quiz generation error:', error);
    return NextResponse.json({
      error: 'Failed to generate quiz',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}