import os
import re
import json
from pathlib import Path
from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
from PIL import Image, ImageOps, ImageEnhance, ImageFilter
import pytesseract

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "bmp", "tiff"}
MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = str(UPLOAD_DIR)
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

# If Tesseract isn't automatically detected on Windows, uncomment and adjust:
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text(image_path):
    """OCR with light preprocessing for better results on photographed pages."""
    with Image.open(image_path) as original:
        image = ImageOps.exif_transpose(original).convert("RGB")
        image = ImageOps.grayscale(image)
        image = ImageEnhance.Contrast(image).enhance(1.6)
        image = image.filter(ImageFilter.SHARPEN)
        return pytesseract.image_to_string(image, config="--psm 6").strip()

def make_summary(text, max_sentences=6):
    """Offline extractive summary; no AI API key required."""
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return "No text was detected. Try a clearer, well-lit image with the page filling most of the frame."
    sentences = re.split(r"(?<=[.!?])\s+", cleaned)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 20]
    if not sentences:
        words = cleaned.split()
        return " ".join(words[:100]) + ("…" if len(words) > 100 else "")
    # Keep the opening sentences as a simple, transparent offline baseline.
    chosen = sentences[:max_sentences]
    return " ".join(chosen)

def make_quiz(text, count=5):
    """Generate basic practice questions from extracted text without external AI."""
    sentences = re.split(r"(?<=[.!?])\s+|\n+", text)
    sentences = [re.sub(r"\s+", " ", s).strip(" •-\t") for s in sentences]
    sentences = [s for s in sentences if len(s.split()) >= 7]
    questions = []
    for sentence in sentences:
        words = re.findall(r"\b[A-Za-z][A-Za-z'-]*\b", sentence)
        candidates = [w for w in words if len(w) >= 5 and w.lower() not in {
            "which", "their", "there", "these", "those", "about", "because",
            "between", "through", "where", "while", "would", "should", "could",
            "important", "example", "called", "following"
        }]
        if not candidates:
            continue
        answer = max(candidates, key=len)
        question = re.sub(r"\b" + re.escape(answer) + r"\b", "________", sentence, count=1, flags=re.I)
        if question != sentence:
            questions.append({"question": question, "answer": answer})
        if len(questions) >= count:
            break
    return questions

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/process", methods=["POST"])
def process_image():
    if "image" not in request.files:
        return jsonify({"error": "Please choose an image first."}), 400
    file = request.files["image"]
    if not file or not file.filename:
        return jsonify({"error": "Please choose an image first."}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "Unsupported file type. Upload PNG, JPG, WEBP, BMP, or TIFF."}), 400

    filename = secure_filename(file.filename)
    # Avoid overwriting files with the same name.
    destination = UPLOAD_DIR / filename
    stem, suffix = destination.stem, destination.suffix
    index = 1
    while destination.exists():
        destination = UPLOAD_DIR / f"{stem}_{index}{suffix}"
        index += 1

    try:
        file.save(destination)
        text = extract_text(destination)
        summary = make_summary(text)
        quiz = make_quiz(text)
        return jsonify({
            "text": text,
            "summary": summary,
            "quiz": quiz,
            "filename": destination.name,
            "message": "Image processed successfully."
        })
    except pytesseract.pytesseract.TesseractNotFoundError:
        return jsonify({
            "error": "Tesseract OCR was not found. Install Tesseract OCR and, if needed, set tesseract_cmd in app.py."
        }), 500
    except Exception as exc:
        app.logger.exception("Image processing failed")
        return jsonify({"error": f"Could not process this image. Try another image. Details: {exc}"}), 500

@app.errorhandler(413)
def too_large(_error):
    return jsonify({"error": "Image is too large. Maximum upload size is 10 MB."}), 413

if __name__ == "__main__":
    app.run(debug=True)
