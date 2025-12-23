# Frappe Pilot - Build & Test Instructions

## 1. Installation

1.  **Open Chrome Extensions**:
    - Navigate to `chrome://extensions` in your browser.
2.  **Enable Developer Mode**:
    - Toggle the "Developer mode" switch in the top-right corner.
3.  **Load Unpacked**:
    - Click the "Load unpacked" button.
    - Select the `frappe-pilot` directory from your project folder:
      `/Users/dante/Documents/Projects/frappe-pilot`

## 2. Usage & Testing

### Initial Setup
1.  Navigate to any Frappe or ERPNext site (e.g., your local instance or a demo site).
2.  **Important**: Refresh the page after installing the extension to ensure the script is injected.
3.  Click the **Frappe Pilot icon** in the browser toolbar to open the popup.
4.  Enable the features you want to test (X-Ray, Teleport, etc.).

### Feature Testing

#### 👁️ X-Ray Mode
- **Toggle**: Turn on "X-Ray Mode" in the popup or press `Alt+X`.
- **Verify**: You should see inline badges next to field labels. The red outline has been removed.
- **Action**: Click a badge to copy the fieldname.

#### 🪄 Magic Filler
- **Toggle**: Ensure "Magic Filler" is enabled in the popup.
- **Action**: Press `Alt+Shift+F` on a Form.
- **Verify**: Mandatory fields should be populated with realistic data fetched from `randomuser.me`.

## 3. Troubleshooting

- **"Teleport not working"**: Ensure you are on a valid Frappe page and have refreshed after install. Check if `Cmd+K` is conflicting with other extensions.
- **"Nothing happens"**: Open the browser console (`F12` or `Cmd+Opt+J`) and check for errors.
- **Persistence**: Settings are saved automatically. If you restart the browser, your preferences should remain.
