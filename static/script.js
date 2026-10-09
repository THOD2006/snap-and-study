const form = document.getElementById("uploadForm");
const input = document.getElementById("imageInput");
const dropZone = document.getElementById("dropZone");
const preview = document.getElementById("imagePreview");
const uploadTitle = document.getElementById("uploadTitle");
const uploadSubtitle = document.getElementById("uploadSubtitle");
const processBtn = document.getElementById("processBtn");
const errorBox = document.getElementById("errorBox");
const extractedText = document.getElementById("extractedText");
const summaryText = document.getElementById("summaryText");
const quizList = document.getElementById("quizList");
const quizIntro = document.getElementById("quizIntro");
const statusPill = document.getElementById("statusPill");
const copyText = document.getElementById("copyText");
const copySummary = document.getElementById("copySummary");

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}
function clearError() {
  errorBox.textContent = "";
  errorBox.hidden = true;
}
function showPreview(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showError("Please select an image file.");
    return;
  }
  clearError();
  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
  uploadTitle.innerHTML = `<span>${escapeHtml(file.name)}</span>`;
  uploadSubtitle.textContent = "Image selected — click Extract & study when ready.";
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
input.addEventListener("change", () => showPreview(input.files[0]));
["dragenter", "dragover"].forEach(eventName => dropZone.addEventListener(eventName, event => {
  event.preventDefault(); dropZone.classList.add("dragover");
}));
["dragleave", "drop"].forEach(eventName => dropZone.addEventListener(eventName, event => {
  event.preventDefault(); dropZone.classList.remove("dragover");
}));
dropZone.addEventListener("drop", event => {
  const file = event.dataTransfer.files[0];
  if (file) {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    showPreview(file);
  }
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  clearError();
  if (!input.files[0]) {
    showError("Please choose a textbook or notes image first.");
    return;
  }
  const formData = new FormData();
  formData.append("image", input.files[0]);
  processBtn.disabled = true;
  processBtn.innerHTML = "Processing… <span>⏳</span>";
  statusPill.classList.remove("ready");
  statusPill.innerHTML = "<i></i> Working on your page";
  try {
    const response = await fetch("/api/process", { method: "POST", body: formData });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Something went wrong.");
    extractedText.value = data.text || "";
    summaryText.textContent = data.summary || "No summary available.";
    summaryText.classList.remove("placeholder");
    copyText.disabled = !data.text;
    copySummary.disabled = !data.summary;
    renderQuiz(data.quiz || []);
    statusPill.classList.add("ready");
    statusPill.innerHTML = "<i></i> Study kit ready";
    document.getElementById("results").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    showError(error.message || "Could not process the image.");
    statusPill.innerHTML = "<i></i> Could not process page";
  } finally {
    processBtn.disabled = false;
    processBtn.innerHTML = 'Extract & study <span>→</span>';
  }
});

function renderQuiz(questions) {
  quizList.innerHTML = "";
  if (!questions.length) {
    quizIntro.textContent = "Not enough readable sentences to make practice questions. Try a page with more text.";
    return;
  }
  quizIntro.textContent = `${questions.length} practice question${questions.length === 1 ? "" : "s"} from your page.`;
  questions.forEach((item, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "quiz-item";
    const question = document.createElement("div");
    question.className = "quiz-question";
    question.textContent = `${index + 1}. ${item.question}`;
    const button = document.createElement("button");
    button.className = "answer-toggle";
    button.type = "button";
    button.textContent = "Reveal answer";
    const answer = document.createElement("span");
    answer.className = "quiz-answer";
    answer.textContent = item.answer;
    button.addEventListener("click", () => {
      const visible = answer.classList.toggle("show");
      button.textContent = visible ? "Hide answer" : "Reveal answer";
    });
    wrapper.append(question, button, answer);
    quizList.appendChild(wrapper);
  });
}

async function copyToClipboard(text, button, originalLabel) {
  if (!text.trim()) return;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "Copied ✓";
    setTimeout(() => button.textContent = originalLabel, 1500);
  } catch {
    showError("Clipboard access is unavailable. Select the text and copy it manually.");
  }
}
copyText.addEventListener("click", () => copyToClipboard(extractedText.value, copyText, "Copy text"));
copySummary.addEventListener("click", () => copyToClipboard(summaryText.textContent, copySummary, "Copy summary"));
