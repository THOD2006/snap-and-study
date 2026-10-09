# Snap & Study

A Flask web app that uploads a study-page image, extracts text with Tesseract OCR, creates a simple extractive summary, and generates basic fill-in-the-blank practice questions. This version works without an AI API key; summary and quiz generation are lightweight offline baselines, not generative AI.

## Requirements
- Python 3.10+
- Tesseract OCR installed separately: https://github.com/UB-Mannheim/tesseract/wiki (Windows installer)
- VS Code (optional)

## Run on Windows
Open a terminal in this project folder:

```powershell
python -m venv venv
venv\Scripts\activate
python -m pip install -r requirements.txt
python app.py
```

If Tesseract isn't found, locate `tesseract.exe` (commonly `C:\Program Files\Tesseract-OCR\tesseract.exe`) and uncomment/set `pytesseract.pytesseract.tesseract_cmd` near the top of `app.py`.

Open the local address printed in the terminal, usually http://127.0.0.1:5000

## Run on macOS
```bash
python3 -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
brew install tesseract
python app.py
```

## Run on Ubuntu/Debian
```bash
python3 -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
sudo apt update && sudo apt install tesseract-ocr
python app.py
```

## Notes
- Uploads are limited to 10 MB. Supported formats: PNG, JPG/JPEG, WEBP, BMP, TIFF.
- Uploaded images are stored in the local `uploads/` folder. Delete them when no longer needed.
- This is a starter project. The summary currently selects opening sentences and the quiz generator creates simple blanks; connect a trusted AI provider to get more sophisticated generated study material.
- Do not expose Flask's development server to the public internet as-is.
