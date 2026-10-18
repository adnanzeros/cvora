# CVora

CVora is a Flask-based CV builder designed for Bangladesh-standard, European-style, international, and modern professional resumes. It provides a responsive editor, live preview, local browser autosave, and PDF export via the browser print workflow.

## Features

- Four distinct template categories
- Bangladesh-standard two-page CV layout with a fixed right-side photo frame and signature area
- Separate European, international, and modern document layouts
- Live preview while editing
- Debounced LocalStorage autosave, manual save, restore, and confirmed clear action
- Local CV Assistant for completeness, email/date checks, missing-field review, section-order suggestions, and page-fit warnings
- On-device job-description keyword comparison; it is a simple text match, not an ATS score
- Editable summary starters based only on user-entered role, skills, and experience
- Repeatable education, employment, projects, languages, and references with move/remove controls
- Drawn or typed applicant signature, plus an independent optional authority signature
- Mobile Edit / Preview switch and A4-ratio document previews
- Browser print-to-PDF flow with A4-specific print styles

## Reference PDF status

The supplied `ratulcv.pdf` reference file is not present in this workspace, so this implementation follows the documented Bangladesh CV conventions rather than a direct inspection of the original PDF. If the PDF is added later, the Bangladesh template should be aligned to its exact structure and spacing.

## Windows setup

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python app.py
```

If PowerShell blocks activation, run:

```powershell
Set-ExecutionPolicy -Scope Process RemoteSigned
.\.venv\Scripts\Activate.ps1
```

Then open: http://127.0.0.1:5000

## Project structure

```text
cvora/
├── app.py
├── requirements.txt
├── README.md
├── .gitignore
├── templates/
│   └── index.html
├── static/
│   ├── css/
│   │   ├── style.css
│   │   └── print.css
│   └── js/
│       └── app.js
├── tests/
│   └── test_app.py
└── .venv/
```

## PDF generation notes

The app uses the browser print dialog (`window.print()`) with dedicated A4 print styles. Choose “Save as PDF” in the browser's print destination. For the Bangladesh template, the app keeps two document pages and refuses to print if its page-fit check detects overflow. Always review the browser's final print preview because browser and system font metrics can differ.

## Local CV Assistant and privacy

The CV Assistant uses browser-side rules and built-in text patterns. It does not call a hosted AI, transmit CV data, or require API credentials. Job-description matching tokenizes text locally and compares terms with the CV; it does not guarantee ATS ranking or employment outcomes. The summary starter uses the role, skills, and experience the user entered and remains editable.

CV details and the optional photo/signature are saved to LocalStorage in the current browser. They are not uploaded or synchronized. Use “Clear CV Data” to remove the stored CV after confirmation. If browser storage is unavailable or full, the save status reports a failure.

## Testing

```powershell
.\.venv\Scripts\Activate.ps1
pytest
```

## Known limitations

- The exact Bangladesh reference PDF was not available in this workspace.
- A browser print flow depends on the browser's PDF engine and system fonts.
- LocalStorage is browser-specific and not synchronized across devices.
- Full Bangla font shaping may vary by operating system and browser.
- The local keyword matcher uses simple English token matching and is not an AI reviewer or ATS simulator.
- The A4 overflow guard is a preview-based estimate; verify the browser's actual print preview before saving.
