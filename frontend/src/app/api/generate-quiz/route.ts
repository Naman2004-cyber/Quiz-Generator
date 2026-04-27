import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { topic, content, numQuestions = 5, questionType = "Multiple Choice", difficulty = "Medium" } = await req.json();

    const difficultyGuide = {
      Easy: "Questions should test basic recall and fundamental understanding. Use simple, direct language.",
      Medium: "Questions should test application and conceptual understanding. Include some tricky distractors.",
      Hard: "Questions should test deep analysis, edge cases, and advanced reasoning. Include nuanced distractors that require careful thought."
    };

    const prompt = `You are an expert adaptive learning tutor. 
    Create a ${numQuestions}-question ${questionType} quiz about ${topic ? topic : "the provided text"}.
    Difficulty Level: ${difficulty}. ${difficultyGuide[difficulty as keyof typeof difficultyGuide] || difficultyGuide.Medium}
    ${content ? `Here is the study material source: ${content}` : ""}
    
    IMPORTANT: Each question MUST include exactly 2 hints. 
    - Hint 1: A subtle nudge or clue (does NOT give away the answer directly).
    - Hint 2: A more direct hint that narrows it down significantly.

    Return the quiz strictly in JSON format. Do not use markdown blocks around the JSON.
    Format your response EXACTLY like this:
    {
      "title": "Quiz Title based on Topic",
      "topic": "${topic || 'General'}",
      "difficulty": "${difficulty}",
      "questions": [
        {
          "id": 1,
          "question": "Question text here?",
          "options": ["A", "B", "C", "D"],
          "correctAnswerIndex": 0,
          "concept": "Underlying concept or skill tested (e.g. 'React UseEffect')",
          "hints": [
            "A subtle clue that guides thinking without giving the answer",
            "A more direct hint that significantly narrows it down"
          ]
        }
      ]
    }`;

    // Groq API (OpenAI-compatible)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API Error:", errorText);
      throw new Error(`Groq API Error: ${errorText}`);
    }

    const data = await response.json();
    let text = data.choices[0].message.content.trim();

    // Strip markdown formatting if it accidentally includes it despite instructions
    if (text.startsWith("```json")) {
      text = text.substring(7);
    }
    if (text.startsWith("```")) {
      text = text.substring(3);
    }
    if (text.endsWith("```")) {
      text = text.substring(0, text.length - 3);
    }

    const quizData = JSON.parse(text);

    return NextResponse.json({ success: true, quiz: quizData });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Failed to generate quiz" }, { status: 500 });
  }
}
