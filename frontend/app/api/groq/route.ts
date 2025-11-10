import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { question, answer, type } = await req.json();

    const prompt = `
    Generate a brief and clear explanation for the following quiz question:
    Question: ${question}
    Correct Answer: ${answer}
    Type: ${type}
    `;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", errorText);
      return NextResponse.json({ error: "Groq API failed" }, { status: 500 });
    }

    const data = await response.json();
    const explanation = data?.choices?.[0]?.message?.content?.trim() || "No explanation generated.";

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error("Error in /api/groq:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
