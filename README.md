# 🚀 Frappe Pilot

**The ultimate browser extension for Frappe & ERPNext developers.**

Frappe Pilot injects a suite of power-user tools directly into the Frappe UI, saving you hours of time on debugging, data entry, and configuration. Every tool can be switched on or off from the extension popup.

## ✨ Features

### 1. 🩻 X-Ray Specs
Hover over any field to instantly see its internal metadata.
- Displays **Fieldname**, **Fieldtype**, and **Options** (e.g., `status | Select : Open, Closed`).
- **Context-Aware:** Works on Forms, Child Tables, and **Pop-up Dialogs**.
- **Clipboard Action:** One-click to copy the fieldname or value.
- **⚙️ Quick Customize:** Every field gets a gear that opens Customize Form for its DocType (the child DocType for fields in a table row) with that field already selected. Custom DocTypes open in the DocType form instead.
- **↗️ Customize Target:** Link, Table, and Table MultiSelect fields also get an arrow that opens Customize Form for the DocType they point to.
- **★ Custom Fields:** Custom fields get a purple badge with a star, so a site's customizations stand out.
- Stays out of the Customize Form / DocType form builder, so dragging fields around isn't cluttered.

### 2. 📋 Field Clipboard
Copy a field value or child table rows and paste them into the same field on another form or another site.
- **Copy Entire Table** or **Copy Selected Rows**.
- Pasting rows removes the empty starter row a new form begins with, then appends. Rows you've filled in are kept.
- The clipboard stays after pasting, so you can paste into several documents. Use **Clear Clipboard** when done.

### 3. 🪄 Magic Filler (AI-powered)
Fill a whole form with realistic test data in one shortcut.
- Uses your own API key: **Gemini** (free tier works), **OpenAI**, or **Claude**. Set it under AI Settings in the popup.
- Respects field types: Select values always come from the field's own options, dates use ISO format, checks are 0/1.
- Leaves Link fields empty instead of inventing records that don't exist.
- Skips hidden, read-only, and layout fields. Works inside dialogs too.

### 4. 👻 Reveal Hidden Fields
Debug visibility rules without touching the code.
- Toggles `hidden=1` fields to be visible.
- Adds a visual `(Hidden)` tag to identify debug fields.
- Highlights wrapper borders for clarity.

### 5. 📦 Data Teleport
Move data between instances (e.g., Production to Local) without CSV imports.
1. Go to any List View.
2. Select rows.
3. Click **Teleport > Copy Selected**.
4. Go to another instance and click **Teleport > Paste Docs**.
5. *Pilot handles dependency cleanup (removing `owner`, timestamps, etc.) automatically and maps `company` to the target site's default.*

If some records already exist on the target site, Pilot tells you which ones and lets you **Skip** them, **Update existing** (child tables are replaced), or **Insert as new copy**.

Also lets you download the selected rows as CSV or JSON.

### 6. 🔗 Link Peek
Hover over any Link field to preview the linked document without leaving the form.

### 7. 📐 Schema Export
Need a list of fields for documentation or a client script?
- Exports a clean list of valid data fields for the current DocType.
- Automatically ignores layout elements (Section Breaks, Column Breaks, Spacers).

### 8. 🔐 Perm Inspector
See at a glance what the current user can do on the open DocType: Read, Write, Create, Delete, Submit, Cancel, and Amend.

## ⌨️ Shortcuts

| Action | Windows / Linux | Mac |
| :--- | :--- | :--- |
| **Magic Filler** | `Alt` + `Shift` + `F` | `Cmd` or `Option` + `Shift` + `F` |
| **Other tools** | *Toggle in popup* | *Toggle in popup* |

## 📦 Installation

### Chrome / Edge / Brave
1. Clone or download this repository.
2. Open your browser and navigate to `chrome://extensions`.
3. Enable **Developer Mode** (top right).
4. Click **Load Unpacked**.
5. Select the `frappe-pilot` folder.

### Safari (macOS)
1. Open `frappe-pilot/safari/Frappe Pilot/Frappe Pilot.xcodeproj` in Xcode.
2. Build and run the app once.
3. In Safari, enable **Settings → Advanced → Show features for web developers**, then **Develop → Allow Unsigned Extensions**.
4. Turn on Frappe Pilot in **Settings → Extensions**.

## 🔒 Privacy
Frappe Pilot only runs on Frappe desk pages (`/app` on v15, `/desk` on v16), never on other websites. It has no analytics and no servers of its own. Full details: [Privacy Policy](PRIVACY.md).

Your AI key is stored locally in the browser and is only sent to the AI provider you choose, and only when you run Magic Filler.

## 🤝 Contributing

Found a bug? The X-Ray logic is sensitive to DOM changes in Frappe.
1. Fork the repo.
2. Create a feature branch.
3. Submit a Pull Request.

**License:** MIT
**Built for the Frappe Community.**
