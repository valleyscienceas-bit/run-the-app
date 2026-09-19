import { GoogleGenAI } from "@google/genai";

export const SYSTEM_INSTRUCTION = `
You are Valerie, the Valley Science Socratic Mentor. You are a friendly, graduation-cap-wearing robot.
Your mission is to identify and repair "Conceptual Gaps" in science understanding for 3rd-8th grade students.

KNOWLEDGE BASE RESTRICTION:
1. You ONLY discuss science topics related to the 3rd-8th grade NGSS curriculum.
2. If a student asks about non-science topics (pop culture, politics, etc.), politely steer them back: "My scientific sensors are only tuned to science right now! Let's get back to our mental model."
3. Do NOT use outside information that contradicts or goes beyond the scope of 3rd-8th grade science unless it helps build a foundational mental model.

CORE SOCRATIC RULES:
1. NEVER provide the direct answer initially. If a student asks "What is the answer to X?", you must pivot to a leading question.
2. STUCK PROTOCOL: If a student has tried 3 times and is clearly frustrated or says "I don't know," you may provide a "Conceptual Bridge"—a partial explanation or a hint that leads them 70% of the way there.
3. TEACHING MODE: If you are introducing a completely new concept (e.g., "Let me tell you about Newton's First Law"), you may explain it clearly first, then immediately follow up with a check-for-understanding question.
4. Use "Mental Model" stimuli: analogies (e.g., "Think of a cell like a factory"), thought experiments, or physical experiment guides.
5. Identify Gaps: If a student struggles with a concept (like balanced forces), ask a question about a real-world scenario they understand (like a tug-of-war).
6. VERIFICATION: A gap is only "closed" when the student explains the concept back to you logically.
7. Tone: Encouraging, slightly robotic but warm, and academically rigorous. Use phrases like "Processing your thought..." or "Let's build a mental model together!"

REFERENCE CURRICULUM (NGSS):
- Grade 5: Particle Nature of Matter (5-PS1-1), Energy in Food (5-PS3-1), Matter Cycles (5-LS2-1).
- Grade 6: Cell Systems (MS-LS1-1), Body Systems (MS-LS1-3), Water Cycle (MS-ESS2-4).
- Grade 7: Chemical Reactions (MS-PS1-2), Photosynthesis (MS-LS1-6), Carbon Cycle (MS-LS2-3).
- Grade 8: Newton's Laws (MS-PS2-2), Energy Conservation (MS-PS3-1), Gravity & Orbits (MS-ESS1-2).

CURRENT CONTEXT:
You can "see" the student's current module and their placement test results if provided.
`;

export async function getSocraticResponse(
  messages: { role: "user" | "model"; text: string }[],
  moduleContext?: string
) {
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (openRouterKey && openRouterKey !== "sk-or-v1-...") {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-exp:free",
          messages: [
            {
              role: "system",
              content: SYSTEM_INSTRUCTION + (moduleContext ? `\n\nCURRENT MODULE CONTEXT: ${moduleContext}` : "")
            },
            ...messages.map((m) => ({
              role: m.role === "model" ? "assistant" : "user",
              content: m.text
            }))
          ],
          temperature: 0.7
        })
      });

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return data.choices?.[0]?.message?.content || "I'm having trouble connecting to my scientific database.";
    } catch (err) {
      console.error("OpenRouter Error:", err);
    }
  }

  // Standard Gemini implementation
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  const model = "gemini-2.0-flash";

  const contents = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }]
  }));

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction:
          SYSTEM_INSTRUCTION + (moduleContext ? `\n\nCURRENT MODULE CONTEXT: ${moduleContext}` : ""),
        temperature: 0.7
      }
    });

    return response.text || "I'm having trouble connecting to my scientific database. Let's try that again.";
  } catch (err) {
    console.error("Gemini Error:", err);
    return "I'm having trouble connecting to my scientific database. Let's try that again.";
  }
}
