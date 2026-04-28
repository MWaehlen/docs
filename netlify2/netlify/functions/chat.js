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
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body." }) }; }

  const { message } = body;
  if (!message || typeof message !== "string") {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing 'message' field." }) };
  }
console.log("=== Step3 ===");
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
console.log("=== Step4 ===");
  // Debug: logge was gesendet wird (erscheint in Netlify Function Logs)
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
    // Netzwerkfehler (DNS, Timeout, etc.)
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
  // Rohantwort lesen
  const rawText = await response.text();
  console.log("=== LANGDOCK RESPONSE ===");
  console.log("Status:", response.status);
  console.log("Body:", rawText);

  // JSON parsen
  let data;
  try { data = JSON.parse(rawText); }
  catch { data = { raw: rawText }; }

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

  // Antworttext extrahieren
  const reply =
    data?.parts?.find(p => p.type === "text")?.text ||
    data?.parts?.[0]?.text ||
    data?.output ||
    data?.content ||
    data?.message ||
    data?.raw ||
    JSON.stringify(data);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reply }),
  };
};

