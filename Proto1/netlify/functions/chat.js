// netlify/functions/chat.js

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  const API_KEY  = process.env.LANGDOCK_API_KEY;
  const AGENT_ID = process.env.LANGDOCK_AGENT_ID;

  console.log("=== Step1 ===");

  if (!API_KEY || !AGENT_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server misconfiguration: LANGDOCK_API_KEY or LANGDOCK_AGENT_ID missing." }),
    };
  }

  console.log("=== Step2 ===");

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body." }) };
  }

  const { message } = body;
  if (!message || typeof message !== "string") {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing 'message' field." }) };
  }

  console.log("=== Step3 ===");

  const payload = {
    agentId: AGENT_ID,
    stream: false,
    messages: [
      {
        id:    "msg_" + Date.now(),
        role:  "user",
        parts: [{ type: "text", text: message.trim() }],
      },
    ],
  };

  console.log("=== Step4 ===");
  console.log("=== LANGDOCK REQUEST ===");
  console.log("URL:", "https://api.langdock.com/agent/v1/chat/completions");
  console.log("AGENT_ID:", AGENT_ID);
  console.log("Payload:", JSON.stringify(payload));

  let response;
  try {
    response = await fetch(
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
  } catch (err) {
    console.error("=== FETCH NETWORK ERROR ===", err.message);
    return {
      statusCode: 502,
      body: JSON.stringify({
        error: "Netzwerkfehler beim Erreichen der Langdock API.",
        detail: err.message,
      }),
    };
  }

  console.log("=== Step5 ===");

  const rawText = await response.text();
  console.log("=== LANGDOCK RESPONSE ===");
  console.log("Status:", response.status);
  console.log("Body:", rawText);

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { raw: rawText };
  }

  if (!response.ok) {
    return {
      statusCode: response.status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error:  data?.error || data?.message || "Langdock API Fehler.",
        detail: data,
        status: response.status,
      }),
    };
  }

  // 🔹 Antworttext aus data.messages extrahieren
  let reply = "";

  if (Array.isArray(data.messages)) {
    // alle Assistant-Messages sammeln
    const assistantMessages = data.messages.filter(
      m => m.role === "assistant"
    );

    // von hinten nach vorne: letzte sinnvolle Antwort nehmen
    for (let i = assistantMessages.length - 1; i >= 0 && !reply; i--) {
      const m = assistantMessages[i];
      const c = m.content;

      if (typeof c === "string") {
        reply = c;
      } else if (Array.isArray(c)) {
        // content als Array von Blöcken
        reply = c
          .map(part => {
            if (typeof part === "string") return part;
            if (part && typeof part.text === "string") return part.text;
            if (part && typeof part.content === "string") return part.content;
            return "";
          })
          .filter(Boolean)
          .join("\n");
      } else if (c && typeof c === "object") {
        if (typeof c.text === "string") reply = c.text;
        else if (typeof c.content === "string") reply = c.content;
      }
    }
  }

  // Fallbacks, falls oben nichts gefunden wurde
  if (!reply) {
    reply =
      data?.output ||
      data?.content ||
      data?.message ||
      data?.raw ||
      JSON.stringify(data);
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reply }),
  };
};
