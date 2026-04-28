# Watchsport – Langdock Chat Landing Page

## Struktur

```
langdock-landing/
├── index.html                     # Landing Page + Chat-Widget
├── netlify.toml                   # Build + Redirect-Konfiguration
└── netlify/
    └── functions/
        └── chat.js                # Serverless Proxy (API-Key bleibt server-seitig)
```

## Korrekte Langdock API (Stand 2025/26)

Endpunkt:  POST https://api.langdock.com/agent/v1/chat/completions

Request-Body:
  {
    "agentId": "...",
    "stream": false,
    "messages": [
      { "id": "msg_1", "role": "user", "parts": [{ "type": "text", "text": "Hallo!" }] }
    ]
  }

Response:
  { "id": "...", "role": "assistant", "parts": [{ "type": "text", "text": "Antwort" }] }

## Netlify Deployment

1. Umgebungsvariablen setzen: Site Settings → Environment Variables
   LANGDOCK_API_KEY  = dein API-Key
   LANGDOCK_AGENT_ID = deine Agent-ID

2. Ordner langdock-landing/ auf app.netlify.com/drop ziehen
   ODER per Git-Integration deployen.

3. Fertig!
