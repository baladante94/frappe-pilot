// content.js

// 1. Inject the main logic script
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = function() { this.remove(); };
(document.head || document.documentElement).appendChild(script);

// 2. Helper: Sync Config & Clipboard to Page
function syncState() {
    chrome.storage.local.get(['xray', 'magic', 'hidden_fields', 'teleport', 'link_peek', 'schema_export', 'perm_inspector', 'fp_field_clipboard'], (res) => {
        // Send Config
        window.postMessage({
            type: "FRAPPE_PILOT_CONFIG",
            config: {
                xray: res.xray || false,
                magic: res.magic || false,
                hidden_fields: res.hidden_fields || false,
                teleport: res.teleport || false,
                link_peek: res.link_peek || false,
                schema_export: res.schema_export || false,
                perm_inspector: res.perm_inspector || false
            }
        }, "*");

        // Send Global Clipboard Data
        if (res.fp_field_clipboard) {
            window.postMessage({ 
                type: "FRAPPE_PILOT_CLIPBOARD_SYNC", 
                payload: res.fp_field_clipboard 
            }, "*");
        }
    });
}

// 3. Initial Sync
syncState();

// 4. Listen for Storage Changes (Sync across tabs)
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.fp_field_clipboard) {
        // If newValue is null/undefined (cleared), send null to page
        window.postMessage({
            type: "FRAPPE_PILOT_CLIPBOARD_SYNC",
            payload: changes.fp_field_clipboard.newValue || null
        }, "*");
    }

    // If any feature toggle changed, re-sync full config to the page.
    // This is a reliable fallback in case chrome.tabs.sendMessage failed.
    const CONFIG_KEYS = ['xray', 'magic', 'hidden_fields', 'teleport', 'link_peek', 'schema_export', 'perm_inspector'];
    if (CONFIG_KEYS.some(k => changes[k] !== undefined)) {
        syncState();
    }
});

// 5. MESSAGE RELAY (Page <-> Extension)
window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    // A. Config Handshake
    if (event.data.type === "FRAPPE_PILOT_HELLO") {
        syncState();
    }

    // B. COPY FIELD: Save to Global Storage
    if (event.data.type === "FRAPPE_PILOT_COPY_FIELD") {
        chrome.storage.local.set({ 'fp_field_clipboard': event.data.payload });
    }

    // --- NEW: CLEAR FIELD (Consume on Paste) ---
    if (event.data.type === "FRAPPE_PILOT_CLEAR_CLIPBOARD") {
        chrome.storage.local.remove('fp_field_clipboard');
    }

    // C. TELEPORT: SAVE Docs
    if (event.data.type === "FRAPPE_PILOT_SAVE_DOCS") {
        chrome.storage.local.set({ 'frappe_clipboard': event.data.payload });
    }

    // D. TELEPORT: LOAD Docs
    if (event.data.type === "FRAPPE_PILOT_GET_DOCS") {
        chrome.storage.local.get(['frappe_clipboard'], (res) => {
            window.postMessage({ 
                type: "FRAPPE_PILOT_RECEIVE_DOCS", 
                payload: res.frappe_clipboard || [] 
            }, "*");
        });
    }

    // E. EXPORT Bridge
    if (event.data.type === "FRAPPE_PILOT_FIELDS_DATA") {
        chrome.runtime.sendMessage({ action: "FIELDS_DATA", data: event.data.payload });
    }

    // F. AI MAGIC FILL Bridge (inject.js → background.js → back)
    if (event.data.type === "FRAPPE_PILOT_AI_FILL_REQUEST") {
        chrome.runtime.sendMessage(
            { action: "GENERATE_AI_DATA", doctype: event.data.doctype, fields: event.data.fields },
            (response) => {
                window.postMessage({
                    type: "FRAPPE_PILOT_AI_FILL_RESPONSE",
                    payload: (response && response.success) ? response.data : { error: (response && response.error) || "AI request failed." }
                }, "*");
            }
        );
    }
});

// 6. Listen for Popup Commands
chrome.runtime.onMessage.addListener((req) => {
    if (req.action === "UPDATE_CONFIG") {
        window.postMessage({ type: "FRAPPE_PILOT_CONFIG", config: req.config }, "*");
    }
    if (req.action === "GET_FIELDS") {
        window.postMessage({ type: "FRAPPE_PILOT_GET_FIELDS" }, "*");
    }
});