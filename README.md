# Harlow Community Services (no-install web tool)

This is a **single-page web app** that runs entirely in the browser (phone, tablet, or computer). It lets you:

- Browse all categories and services from the supplied spreadsheet.
- Search using natural language (fuzzy search + synonym expansion + safety boosts).
- View each service as a card with a short **generated keywords summary**.
- Expand a card to see the **full description exactly as stored** (links rendered without changing visible text).
- Select services to build an output for a patient.
- Edit the title / add notes per service.
- Copy to clipboard, print (with full URLs), or download as PDF.
- Toggle **Hyperlink / Plain text** for final output.

## How to share (no installation)

You just need to **host these files** somewhere that serves static webpages:

### Option A) SharePoint / Teams (recommended in NHS environments)
1. Create a SharePoint site (or use an existing one).
2. Upload the entire folder contents.
3. Create a page and add a **File Viewer** or link to `index.html`.

### Option B) GitHub Pages
1. Create a new repo.
2. Upload the folder.
3. Enable Pages for the main branch.

### Option C) Azure Static Web Apps
Upload the folder as a static site.

## Updating services
Replace `data/services.json` by re-running the build script (or ask Copilot to re-import an updated spreadsheet).

## Notes
- No patient data is stored.
- All processing is in-browser.
- Colours are NHS-inspired but **no logos or branding** are included.
