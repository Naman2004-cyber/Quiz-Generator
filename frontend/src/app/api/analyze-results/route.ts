import { NextResponse } from "next/server";
import { SERVER_BACKEND_URL } from "@/lib/config";

export async function POST(req: Request) {
  try {
    const { quiz, answers, history } = await req.json();

    // Map answers robustly handling API return anomalies (e.g. String types instead of Integer)
    const analyzedQuestions = quiz.questions.map((q: any, i: number) => {
      const userAns = Number(answers[i]);
      let correctAns = q.correctAnswerIndex;
      if (typeof correctAns === "string") {
         correctAns = correctAns.toUpperCase();
         if (correctAns === "A") correctAns = 0;
         else if (correctAns === "B") correctAns = 1;
         else if (correctAns === "C") correctAns = 2;
         else if (correctAns === "D") correctAns = 3;
         else correctAns = Number(correctAns);
      } else {
         correctAns = Number(correctAns);
      }
      return {
      question: q.question,
      concept: q.concept,
      isCorrect: userAns === correctAns,
      selectedAnswer: q.options[userAns] || null,
      correctAnswer: q.options[correctAns],
    }});

    const prompt = `You are an expert adaptive learning tutor analyzing a student's quiz results.
    Here is the data from their recent quiz Attempt:
    ${JSON.stringify(analyzedQuestions, null, 2)}
    
    Based on this data, identify their main skill gaps and strengths.
    Return an analysis strictly in JSON format. Do not use markdown blocks around the JSON.
    Format your response EXACTLY like this:
    {
      "score": 80,
      "strengths": ["Concept 1", "Concept 2"],
      "weaknesses": ["Concept 3"],
      "improvementPlan": [
        "Actionable advice 1",
        "Actionable advice 2"
      ],
      "recommendedResources": [
        { "title": "Official Docs / Resource Name", "url": "https://...", "topic": "The related weakness" }
      ],
      "feedbackSummary": "A short encouraging paragraph analyzing their overall performance."
    }`;

    // Groq API (OpenAI-compatible)
    const groqPromise = fetch("https://api.groq.com/openai/v1/chat/completions", {
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

    const mlPromise = fetch(`${SERVER_BACKEND_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history: history || [] }),
    }).catch(err => {
      console.warn("ML Backend unavailable:", err);
      return null;
    });

    const trendPromise = fetch(`${SERVER_BACKEND_URL}/api/trend`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ history: history || [] }),
    }).catch(() => null);

    const clusterPromise = fetch(`${SERVER_BACKEND_URL}/api/explain-cluster`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ history: history || [] }),
    }).catch(() => null);

    const nextQuizPromise = fetch(`${SERVER_BACKEND_URL}/api/next-quiz`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ history: history || [] }),
    }).catch(() => null);

    const [response, mlResponse, trendRes, clusterRes, nextQuizRes] = await Promise.all([groqPromise, mlPromise, trendPromise, clusterPromise, nextQuizPromise]);

    let analysisData: any;

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API Error:", errorText);
      
      analysisData = {
         score: Math.round((analyzedQuestions.filter((q: any) => q.isCorrect).length / analyzedQuestions.length) * 100),
         strengths: ["Internal metrics tracking deployed"],
         weaknesses: ["Generative feedback paused due to API demand"],
         improvementPlan: ["The internal machine learning matrix has taken over tracking your metrics."],
         recommendedResources: [],
         feedbackSummary: "Your evaluation was successfully recorded, however our generative AI is currently rate-limited. Falling back strictly to mathematical forecasting."
      }
    } else {
      const data = await response.json();
      let text = data.choices[0].message.content.trim();
      if (text.startsWith("```json")) text = text.substring(7);
      if (text.startsWith("```")) text = text.substring(3);
      if (text.endsWith("```")) text = text.substring(0, text.length - 3);

      analysisData = JSON.parse(text);
      
      // Explicitly override LLM hallucinated arithmetic with absolute computation
      analysisData.score = Math.round((analyzedQuestions.filter((q: any) => q.isCorrect).length / analyzedQuestions.length) * 100);
    }

    let mlData: any = null;
    if (mlResponse && mlResponse.ok) {
        mlData = await mlResponse.json();
        if (trendRes && trendRes.ok) mlData.trendData = await trendRes.json();
        if (clusterRes && clusterRes.ok) mlData.clusterExplanation = await clusterRes.json();
        if (nextQuizRes && nextQuizRes.ok) mlData.nextQuizRecommendation = await nextQuizRes.json();
    }

    return NextResponse.json({ success: true, analysis: analysisData, mlMetrics: mlData, details: analyzedQuestions });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Failed to analyze results" }, { status: 500 });
  }
}
