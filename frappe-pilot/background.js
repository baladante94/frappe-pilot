chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GENERATE_AI_DATA") {
        
        chrome.storage.local.get(['apiKey', 'aiProvider'], async (res) => {
            if (!res.apiKey) {
                sendResponse({ error: "API Key missing. Check Extension Popup." });
                return;
            }

            const provider = res.aiProvider || 'gemini';
            const schemaString = JSON.stringify(request.fields);
            
            // Common Prompt
            const promptText = `
            Act as a QA data generator for ERPNext.
            Context: User is filling a "${request.doctype}" form.
            Task: Generate realistic JSON data for these fields:
            ${schemaString}
            
            Constraints:
            1. Output ONLY valid JSON.
            2. For 'Select' fields, strictly use one of the provided options.
            3. For 'Link' fields, invent a realistic name.
            4. For 'Phone', use '+9199...' format.
            5. Ensure data consistency (e.g. India -> Mumbai).
            `;

            try {
                let jsonResponse = "";

                if (provider === 'openai') {
                    // --- OPENAI CALL ---
                    const response = await fetch("https://api.openai.com/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${res.apiKey}`
                        },
                        body: JSON.stringify({
                            model: "gpt-3.5-turbo",
                            messages: [{ role: "user", content: promptText }],
                            temperature: 0.7
                        })
                    });
                    const data = await response.json();
                    if (data.error) throw new Error(data.error.message);
                    jsonResponse = data.choices[0].message.content;

                } else {
                    // --- GEMINI CALL (Free Tier) ---
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${res.apiKey}`;
                    
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

                // Clean and Send
                jsonResponse = jsonResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                sendResponse({ success: true, data: JSON.parse(jsonResponse) });

            } catch (error) {
                sendResponse({ error: error.message });
            }
        });

        return true; 
    }
});