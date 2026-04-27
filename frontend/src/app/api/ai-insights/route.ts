import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { quizHistory, stats, skillMap } = await req.json();

    const prompt = `You are an expert AI learning tutor for the "Aura Learn" platform.
    Analyze the following student performance data and generate intelligent, personalized insights.

    STUDENT STATS:
    - Total Quizzes: ${stats.totalQuizzes}
    - Average Accuracy: ${stats.averageAccuracy}%
    - Current Streak: ${stats.currentStreak} days
    - Learning Level: ${stats.learningLevel}
    - Total Time Spent: ${Math.round(stats.totalTimeSeconds / 60)} minutes

    SKILL MAP (topic → accuracy):
    ${JSON.stringify(skillMap, null, 2)}

    RECENT QUIZ HISTORY (last 10):
    ${JSON.stringify(
      quizHistory.slice(0, 10).map((q: any) => ({
        topic: q.topic,
        score: q.score,
        difficulty: q.difficulty,
        date: new Date(q.timestamp).toLocaleDateString(),
        timeSpent: Math.round(q.timeSpentSeconds / 60) + "min",
      })),
      null,
      2
    )}

    Return your analysis strictly in JSON format. Do not use markdown blocks around the JSON.
    Format your response EXACTLY like this:
    {
      "weeklyDigest": "A 2-3 sentence performance summary for this student's recent activity.",
      "topicsToRevise": ["Topic 1", "Topic 2"],
      "suggestedNextQuiz": {
        "topic": "Recommended topic",
        "difficulty": "Easy|Medium|Hard",
        "reason": "Why this topic and difficulty"
      },
      "improvementTrends": ["Trend observation 1", "Trend observation 2"],
      "personalizedTips": ["Actionable tip 1", "Actionable tip 2", "Actionable tip 3"],
      "focusAreas": [
        { "topic": "Topic name", "priority": "high|medium|low", "suggestion": "What to do" }
      ],
      "motivationalMessage": "A short encouraging message based on their actual data."
    }`;

    // Groq API (OpenAI-compatible)
    const groqPromise = fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
          max_tokens: 4096,
        }),
      }
    );

    const mlPromise = fetch("http://127.0.0.1:8000/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history: quizHistory || [] }),
    }).catch((err) => {
      console.warn("ML backend fetch error:", err);
      return null;
    });

    const histBody = JSON.stringify({ history: quizHistory || [] });
    const mlHeaders = { "Content-Type": "application/json" };

    const trendPromise = fetch("http://127.0.0.1:8000/api/trend", {
      method: "POST", headers: mlHeaders, body: histBody,
    }).catch(() => null);

    const clusterPromise = fetch("http://127.0.0.1:8000/api/explain-cluster", {
      method: "POST", headers: mlHeaders, body: histBody,
    }).catch(() => null);

    const nextQuizPromise = fetch("http://127.0.0.1:8000/api/next-quiz", {
      method: "POST", headers: mlHeaders, body: histBody,
    }).catch(() => null);

    // Deep Analytics Tier 2 endpoints
    const deepProfilePromise = fetch("http://127.0.0.1:8000/api/deep-profile", {
      method: "POST", headers: mlHeaders, body: histBody,
    }).catch(() => null);

    const topicMatrixPromise = fetch("http://127.0.0.1:8000/api/topic-matrix", {
      method: "POST", headers: mlHeaders, body: histBody,
    }).catch(() => null);

    const learningRhythmPromise = fetch("http://127.0.0.1:8000/api/learning-rhythm", {
      method: "POST", headers: mlHeaders, body: histBody,
    }).catch(() => null);

    const comparativePromise = fetch("http://127.0.0.1:8000/api/comparative-stats", {
      method: "POST", headers: mlHeaders, body: histBody,
    }).catch(() => null);

    const featureImpPromise = fetch("http://127.0.0.1:8000/api/feature-importance", {
      method: "GET", headers: mlHeaders,
    }).catch(() => null);

    const forecastPromise = fetch("http://127.0.0.1:8000/api/progress-forecast", {
      method: "POST", headers: mlHeaders, body: histBody,
    }).catch(() => null);

    const [response, mlResponse, trendRes, clusterRes, nextQuizRes,
           deepProfileRes, topicMatrixRes, rhythmRes, comparativeRes, featureImpRes, forecastRes
    ] = await Promise.all([
      groqPromise, mlPromise, trendPromise, clusterPromise, nextQuizPromise,
      deepProfilePromise, topicMatrixPromise, learningRhythmPromise,
      comparativePromise, featureImpPromise, forecastPromise
    ]);

    let insights: any;
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API Error:", errorText);
      
      // Graceful fallback so Python ML metrics still display
      insights = {
        weeklyDigest: "AI is currently under high demand (Rate Limited). Your dashboard is falling back to our internal predictive Machine Learning rules.",
        topicsToRevise: [],
        suggestedNextQuiz: null,
        improvementTrends: [],
        personalizedTips: ["Check back in 30 seconds for full generative insights!"],
        focusAreas: [],
        motivationalMessage: "Relying on hard math logic for now. Keep pushing metrics!",
      };
    } else {
      const data = await response.json();
      let text = data.choices[0].message.content.trim();

      // Strip markdown formatting
      if (text.startsWith("```json")) text = text.substring(7);
      if (text.startsWith("```")) text = text.substring(3);
      if (text.endsWith("```")) text = text.substring(0, text.length - 3);

      insights = JSON.parse(text.trim());
    }

    if (mlResponse && mlResponse.ok) {
       insights.mlMetrics = await mlResponse.json();
       if (trendRes && trendRes.ok) insights.mlMetrics.trendData = await trendRes.json();
       if (clusterRes && clusterRes.ok) insights.mlMetrics.clusterExplanation = await clusterRes.json();
       if (nextQuizRes && nextQuizRes.ok) insights.mlMetrics.nextQuizRecommendation = await nextQuizRes.json();
    }

    // Attach Deep Analytics data
    if (!insights.mlMetrics) insights.mlMetrics = {};
    if (deepProfileRes && deepProfileRes.ok) insights.mlMetrics.deepProfile = await deepProfileRes.json();
    if (topicMatrixRes && topicMatrixRes.ok) insights.mlMetrics.topicMatrix = await topicMatrixRes.json();
    if (rhythmRes && rhythmRes.ok) insights.mlMetrics.learningRhythm = await rhythmRes.json();
    if (comparativeRes && comparativeRes.ok) insights.mlMetrics.comparativeStats = await comparativeRes.json();
    if (featureImpRes && featureImpRes.ok) insights.mlMetrics.featureImportance = await featureImpRes.json();
    if (forecastRes && forecastRes.ok) insights.mlMetrics.progressForecast = await forecastRes.json();

    return NextResponse.json({ success: true, insights });
  } catch (error: any) {
    console.error("AI Insights Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate insights" },
      { status: 500 }
    );
  }
}
