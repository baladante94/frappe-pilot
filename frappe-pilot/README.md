# 🚀 Frappe Pilot

**The ultimate browser extension for Frappe & ERPNext developers.**

Frappe Pilot injects a suite of power-user tools directly into the Frappe UI, saving you hours of time on debugging, data entry, and configuration.

![Frappe Pilot Demo](https://via.placeholder.com/800x400?text=Frappe+Pilot+Preview)

## ✨ Features

### 1. 🩻 X-Ray Specs
Hover over any field to instantly see its internal metadata.
- Displays **Fieldname**, **Fieldtype**, and **Options** (e.g., `status | Select : Open, Closed`).
- **Context-Aware:** Works on Forms, Child Tables, and **Pop-up Dialogs**.
- **Clipboard Action:** One-click to copy the fieldname or value.

### 2. 🪄 Magic Filler (`Alt + Shift + F`)
Populate forms with realistic dummy data instantly.
- **Smart Detection:** Fills Names, Emails, Phones, Dates, and Links based on field type.
- **Mandatory Only:** Strictly targets mandatory fields (`reqd=1`) to ensure successful saves without clutter.
- **Dialog Support:** Works perfectly inside modals.

### 3. 👻 Reveal Hidden Fields
Debug visibility rules without touching the code.
- Toggles `hidden=1` fields to be visible.
- Adds a visual `(Hidden)` tag to identifying debug fields.
- Highlights wrapper borders for clarity.

### 4. 📦 Data Teleport
Move data between instances (e.g., Production to Local) without CSV exports.
1. Go to any List View.
2. Select rows.
3. Click **Teleport > Copy Selected**.
4. Go to another instance and click **Teleport > Paste Docs**.
5. *Pilot handles dependency cleanup (removing `name`, `owner`, etc.) automatically.*

### 5. 🛠️ Schema Export
Need a list of fields for documentation or a client script?
- Exports a clean list of valid data fields from the current view.
- Automatically ignores layout elements (Section Breaks, Column Breaks, Spacers).

## ⌨️ Shortcuts

| Action | Windows / Linux | Mac |
| :--- | :--- | :--- |
| **Magic Filler** | `Alt` + `Shift` + `F` | `Cmd` + `Shift` + `F` |
| **Toggle X-Ray** | *Toggle in Widget* | *Toggle in Widget* |

## 📦 Installation

### Chrome / Edge / Brave
1. Clone or download this repository.
2. Open your browser and navigate to `chrome://extensions`.
3. Enable **Developer Mode** (top right).
4. Click **Load Unpacked**.
5. Select the `frappe-pilot` folder.

## 🤝 Contributing

Found a bug? The X-Ray logic is sensitive to DOM changes in Frappe.
1. Fork the repo.
2. Create a feature branch.
3. Submit a Pull Request.

**License:** MIT
**Built for the Frappe Community.**