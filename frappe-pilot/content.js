// Inject the main script
const s = document.createElement('script');
s.src = chrome.runtime.getURL('inject.js');
s.onload = function() { this.remove(); };
(document.head || document.documentElement).appendChild(s);

// --- MESSAGE RELAY ---
window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    // 1. Config Handshake
    if (event.data.type === "FRAPPE_PILOT_HELLO") {
        chrome.storage.local.get(['xray', 'magic', 'hidden_fields', 'teleport'], (res) => {
            window.postMessage({ type: "FRAPPE_PILOT_CONFIG", config: res }, "*");
        });
    }

    // 2. TELEPORT: SAVE to Chrome Storage
    if (event.data.type === "FRAPPE_PILOT_SAVE_DOCS") {
        chrome.storage.local.set({ 'frappe_clipboard': event.data.payload }, () => {
            console.log("Frappe Pilot: Docs saved to clipboard");
        });
    }

    // 3. TELEPORT: LOAD from Chrome Storage
    if (event.data.type === "FRAPPE_PILOT_GET_DOCS") {
        chrome.storage.local.get(['frappe_clipboard'], (res) => {
            window.postMessage({ 
                type: "FRAPPE_PILOT_RECEIVE_DOCS", 
                payload: res.frappe_clipboard || [] 
            }, "*");
        });
    }

    // 4. EXPORT: Bridge
    if (event.data.type === "FRAPPE_PILOT_GET_FIELDS") {
        chrome.runtime.sendMessage({ action: "GET_FIELDS" });
    }
    if (event.data.type === "FRAPPE_PILOT_FIELDS_DATA") {
        chrome.runtime.sendMessage({ action: "FIELDS_DATA", data: event.data.payload });
    }
});

// Update Config Listener
chrome.runtime.onMessage.addListener((req) => {
    if (req.action === "UPDATE_CONFIG") {
        window.postMessage({ type: "FRAPPE_PILOT_CONFIG", config: req.config }, "*");
    }
    if (req.action === "GET_FIELDS") {
        window.postMessage({ type: "FRAPPE_PILOT_GET_FIELDS" }, "*");
    }
});