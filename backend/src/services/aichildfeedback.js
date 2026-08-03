/**
 * AI Child Feedback Generator
 * Converts a teacher's freeform observations about a child into a
 * standardized structure: Strengths Observed / Areas Needing Support /
 * Teacher Recommendation. Provider chain: Groq -> Mistral -> Gemini -> local template.
 */

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || "mistral-small-2506";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const SYSTEM_PROMPT = `You are an early-childhood education assistant helping a teacher turn
freeform notes about a child into standardized feedback for the child's record.
Given the child's name and the teacher's freeform notes, return ONLY a JSON object,
no markdown, no extra text, with exactly these keys:
"strengths" (string — concrete, specific strengths observed),
"areasNeedingSupport" (string — concrete areas the child needs support with),
"recommendation" (string — a clear, actionable teacher recommendation).
Base everything strictly on what the teacher wrote; do not invent facts not implied by the notes.
Keep each field to 2-4 sentences, warm and professional in tone, written for a parent/admin audience.`;

function aiLog(event, details = {}) {
  console.log(`[ai-child-feedback] ${event}`, JSON.stringify(details));
}

function buildLocalDraft({ childName, freeformText }) {
  const trimmed = freeformText.trim();
  return {
    strengths: `Based on the teacher's notes, ${childName} shows engagement and effort. Notes: "${trimmed.slice(0, 160)}${trimmed.length > 160 ? "…" : ""}"`,
    areasNeedingSupport: `A closer review of the notes suggests some areas may benefit from continued attention. Please review and refine this section, as it was generated without an AI provider configured.`,
    recommendation: `Continue observing ${childName} in the areas mentioned above and share specific examples with the parent/guardian during the next check-in.`,
  };
}

function stripCodeFences(raw) {
  let text = String(raw || "").trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "");
    text = text.replace(/\s*```$/, "");
  }
  return text.trim();
}

function parseFeedbackJson(raw) {
  const cleaned = stripCodeFences(raw);
  const draft = JSON.parse(cleaned);
  if (!draft || typeof draft.strengths !== "string") {
    throw new Error("Invalid child feedback JSON: missing strengths.");
  }
  return {
    strengths: String(draft.strengths || "").trim(),
    areasNeedingSupport: String(draft.areasNeedingSupport || draft.areas_needing_support || "").trim(),
    recommendation: String(draft.recommendation || "").trim(),
  };
}

async function callGroq({ childName, freeformText, apiKey }) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Child name: ${childName}\nTeacher's freeform notes:\n${freeformText}` },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Groq API failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  return parseFeedbackJson(content);
}

async function callMistral({ childName, freeformText, apiKey }) {
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Child name: ${childName}\nTeacher's freeform notes:\n${freeformText}` },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Mistral API failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  return parseFeedbackJson(content);
}

async function callGemini({ childName, freeformText, apiKey }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${SYSTEM_PROMPT}\n\nChild name: ${childName}\nTeacher's freeform notes:\n${freeformText}`,
              },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini API failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const data = await response.json();
  const content =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim() || "";
  return parseFeedbackJson(content);
}

function isUsableKey(key) {
  if (!key) return false;
  if (/^YOUR_/i.test(key) || /placeholder/i.test(key) || key === "your_api_key_here") return false;
  return true;
}

/**
 * Generate structured feedback from a teacher's freeform notes.
 * @param {{ childName: string, freeformText: string }} input
 */
export async function generateAIChildFeedback(input = {}) {
  const childName = String(input.childName || "").trim();
  const freeformText = String(input.freeformText || "").trim();

  if (!childName || !freeformText) {
    const err = new Error("childName and freeformText are required.");
    err.status = 400;
    throw err;
  }

  const groqKey = process.env.GROQ_API_KEY;
  const mistralKey = process.env.MISTRAL_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

  let draft = null;
  let provider = "local";

  if (isUsableKey(groqKey)) {
    try {
      aiLog("groq_start", { model: GROQ_MODEL, childName });
      draft = await callGroq({ childName, freeformText, apiKey: groqKey });
      provider = "groq";
    } catch (err) {
      aiLog("groq_failed", { message: err.message });
    }
  }

  if (!draft && isUsableKey(mistralKey)) {
    try {
      aiLog("mistral_start", { model: MISTRAL_MODEL, childName });
      draft = await callMistral({ childName, freeformText, apiKey: mistralKey });
      provider = "mistral";
    } catch (err) {
      aiLog("mistral_failed", { message: err.message });
    }
  }

  if (!draft && isUsableKey(geminiKey)) {
    try {
      aiLog("gemini_start", { model: GEMINI_MODEL, childName });
      draft = await callGemini({ childName, freeformText, apiKey: geminiKey });
      provider = "gemini";
    } catch (err) {
      aiLog("gemini_failed", { message: err.message });
    }
  }

  if (!draft) {
    aiLog("local_fallback", { childName });
    draft = buildLocalDraft({ childName, freeformText });
    provider = "local";
  }

  return {
    childName,
    strengths: draft.strengths,
    areasNeedingSupport: draft.areasNeedingSupport,
    recommendation: draft.recommendation,
    provider,
    isLocalFallback: provider === "local",
  };
}