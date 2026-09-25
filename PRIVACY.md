# Frappe Pilot Privacy Policy

_Last updated: 25 September 2026_

Frappe Pilot is a browser extension for developers and consultants working with Frappe and ERPNext. This policy explains what data it handles and where that data goes.

## Summary
- Frappe Pilot does **not** collect, sell, or share your data.
- It has **no analytics, tracking, or servers** of its own.
- It only runs on Frappe desk pages (`/app` on Frappe v15, `/desk` on Frappe v16).

## Data stored on your device
The following is saved in your browser's local extension storage and never leaves your computer, except as described under "AI features" below:
- Your tool settings (which features are switched on).
- Your AI provider choice and API key, if you add one.
- Data you copy with Field Clipboard or Data Teleport (field values, table rows, or records), so you can paste it into another Frappe site. You can clear the Field Clipboard at any time, and removing the extension deletes all of this data.

## Communication with your Frappe site
Features like X-Ray, Link Peek, Teleport, and Quick Customize read from and write to the Frappe site you are already logged into, using your own session and permissions. Nothing is sent anywhere else.

## AI features (optional)
Magic Filler is off by default and only works if you add your own API key. When you trigger it, Frappe Pilot sends a request directly from your browser to the AI provider you chose (Google Gemini, OpenAI, or Anthropic). The request contains:
- the DocType name, and
- the form's field definitions (label, fieldname, field type, options, and whether it is mandatory).

It does **not** send the values already entered in your records. The provider's own privacy policy applies to that request.

## Permissions
- `storage`: to save your settings, API key, and clipboard data locally.
- `activeTab`: so the popup can talk to the Frappe page you are viewing.
- Content script access limited to `/app` and `/desk` URLs, where the Frappe desk runs.

## Contact
Questions or concerns: open an issue at https://github.com/baladante94/frappe-pilot/issues
