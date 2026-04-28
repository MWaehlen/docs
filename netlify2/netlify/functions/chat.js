// netlify/functions/chat.js
// Serverless Proxy fuer die Langdock Agents Completions API
//
// Umgebungsvariablen in Netlify setzen:
//   LANGDOCK_API_KEY   -> Dein Langdock API-Key
//   LANGDOCK_AGENT_ID  -> Deine Agent-ID (z.B. "agent_123abc")

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  const API_KEY  = process.env.LANGDOCK_API_KEY;
  const AGENT_ID = process.env.LANGDOCK_AGENT_ID;

  if (!API_KEY || !AGENT_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server misconfiguration: LANGDOCK_API_KEY or LANGDOCK_AGENT_ID missing." }),
    };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body." }) }; }

  const { message } = body;
  if (!message || typeof message !== "string") {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing 'message' field." }) };
  }

  // Vercel AI SDK UIMessage format (required by Langdock Agents API)
  const payload = {
    agentId: AGENT_ID,
    stream:  false,
    messages: [
      {
        id:    "msg_" + Date.now(),
        role:  "user",
        parts: [{ type: "text", text: message.trim() }],
      },
    ],
  };

  try {
    const response = await fetch(
      "https://api.langdock.com/agent/v1/chat/completions",
      {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": "Bearer " + API_KEY,
        },
        body: JSON.stringify(payload),
      }
    );

    const contentType = response.headers.get("content-type") || "";
    let data;
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = { raw: await response.text() };
    }

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: data?.error || data?.message || "Langdock API Fehler." }),
      };
    }

    // Langdock Response (non-streaming):
    // { "id": "...", "role": "assistant", "parts": [{"type":"text","text":"..."}], "output": ... }
    const reply =
      data?.parts?.find(p => p.type === "text")?.text ||
      data?.parts?.[0]?.text ||
      data?.output ||
      data?.raw ||
      JSON.stringify(data);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    };

  } catch (err) {
    console.error("Langdock fetch error:", err);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: "Verbindung zur Langdock API fehlgeschlagen.", detail: err.message }),
    };
  }
};
