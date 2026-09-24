chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.action === "FIELDS_DATA") {
        // Relay field scan data back to the popup
        chrome.runtime.sendMessage({ action: "FIELDS_DATA", data: request.data });
        return false;
    }

    if (request.action === "GENERATE_AI_DATA") {
        chrome.storage.local.get(['apiKey', 'aiProvider'], async (res) => {
            if (!res.apiKey) {
                sendResponse({ error: "No API key set. Open the extension popup and add one under AI Settings." });
                return;
            }

            const provider = res.aiProvider || 'gemini';

            const promptText = `You are a QA test-data generator for ERPNext / Frappe Framework.
The user is filling a "${request.doctype}" form.
Generate realistic, consistent test values for ALL of the fields listed below.

Field list (JSON array):
${JSON.stringify(request.fields, null, 2)}

Rules:
1. Return ONLY a single flat JSON object: { "fieldname": value, ... } — every field in the list must have a key, but its value may be an empty string "" where these rules say to leave it blank.
2. For Link fields: ALWAYS return "". Never invent a record name (e.g. never make up an Address, Customer, or any other linked document) — you have no visibility into what actually exists in this database, and a guessed value either creates a broken reference or fails validation on save. This applies even to mandatory Link fields; the user will fill those manually.
3. For Select fields: the value MUST be EXACTLY one of the provided options (split by \\n), copied character-for-character. Never write a value that is not in that list. If the field is optional (reqd=0) and no option is clearly appropriate, return "".
4. For every other field type: if reqd=1, provide a realistic, non-empty value. If reqd=0, only provide a value when it's clearly useful test data — otherwise return "" and leave it blank rather than inventing filler.
5. For Date fields use ISO format YYYY-MM-DD. Use today (${new Date().toISOString().slice(0,10)}) unless the label suggests otherwise.
6. For Int / Float / Currency use realistic numbers appropriate to the field label.
7. For Check fields use 0 or 1.
8. Keep data internally consistent (same company name, matching city/state, etc.).
9. Use Indian locale by default (names, cities, phone numbers, currency INR).
10. Do NOT include markdown fences, comments, or any text outside the JSON object.`;

            try {
                let jsonResponse = "";

                if (provider === 'openai') {
                    const response = await fetch("https://api.openai.com/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${res.apiKey}`
                        },
                        body: JSON.stringify({
                            model: "gpt-4o-mini",
                            messages: [{ role: "user", content: promptText }],
                            temperature: 0.7,
                            response_format: { type: "json_object" }
                        })
                    });
                    const data = await response.json();
                    if (data.error) throw new Error(data.error.message);
                    jsonResponse = data.choices[0].message.content;

                } else if (provider === 'claude') {
                    const response = await fetch("https://api.anthropic.com/v1/messages", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "x-api-key": res.apiKey,
                            "anthropic-version": "2023-06-01",
                            "anthropic-dangerous-direct-browser-access": "true"
                        },
                        body: JSON.stringify({
                            model: "claude-haiku-4-5-20251001",
                            max_tokens: 1024,
                            messages: [{ role: "user", content: promptText }]
                        })
                    });
                    const data = await response.json();
                    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
                    jsonResponse = data.content[0].text;

                } else {
                    // Gemini (default / free tier)
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${res.apiKey}`;
                    const response = await fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: promptText }] }],
                            generationConfig: { response_mime_type: "application/json" }
                        })
                    });
                    const data = await response.json();
                    if (data.error) throw new Error(data.error.message);
                    jsonResponse = data.candidates[0].content.parts[0].text;
                }

                jsonResponse = jsonResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                sendResponse({ success: true, data: JSON.parse(jsonResponse) });

            } catch (error) {
                sendResponse({ error: error.message });
            }
        });

        return true;
    }
});