import { generateText } from "ai"
export async function generateExplanation(
  question: string,
  answer: string,
  type: string
) {
  try {
    const res = await fetch("/api/groq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer, type }),
    });

    if (!res.ok) throw new Error("Failed to call API");

    const data = await res.json();
    return data.explanation || "Unable to generate explanation";
  } catch (error) {
    console.error("Error generating explanation:", error);
    throw error;
  }
}

