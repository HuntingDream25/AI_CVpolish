const uploadInput = document.getElementById("resume-upload");
const statusText = document.getElementById("upload-status");
const rawTextEl = document.getElementById("raw-text");
const suggestionsEl = document.getElementById("suggestions");
const polishedEl = document.getElementById("polished");
const pageCountEl = document.getElementById("page-count");
const suggestionCountEl = document.getElementById("suggestion-count");
const summaryCountEl = document.getElementById("summary-count");
const demoButton = document.getElementById("demo-button");

const demoText = `Alex Chen\nData Analyst | 3 Years Experience\n\nEducation\n- 2018.09-2022.06 Beijing University, B.S. in Statistics\n\nWork Experience\n- 2022.07-Present Internet Company, Data Analyst\n  Owned user growth monitoring and automated daily/weekly reports\n  Partnered with product teams to optimize funnel conversion\n\nProjects\n- Built a retention analysis model, improving next-day retention by 8%\n- Designed BI dashboards to support cross-functional data needs\n\nSkills\nSQL / Python / Tableau / Data Visualization`;

function setStatus(message, tone = "default") {
  statusText.textContent = message;
  statusText.dataset.tone = tone;
}

function updateCounters({ pages = 0, suggestions = 0, summary = 0 }) {
  pageCountEl.textContent = String(pages);
  suggestionCountEl.textContent = String(suggestions);
  summaryCountEl.textContent = String(summary);
}

function sanitizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function generateSuggestions(text) {
  const suggestions = [];
  const lines = text.split(/\n|\r/).map((line) => line.trim()).filter(Boolean);
  if (!/\d/.test(text)) {
    suggestions.push("Add measurable outcomes (e.g., % lift, revenue impact, user growth).");
  }
  if (!/项目|Project|项目经验/.test(text)) {
    suggestions.push("Include 2-3 standout project highlights.");
  }
  const hasActionVerb = /(负责|搭建|优化|提升|设计|交付|led|built|optimized|improved|designed|delivered)/i.test(text);
  if (!hasActionVerb) {
    suggestions.push("Start bullets with strong action verbs (e.g., led, optimized, delivered).");
  }
  if (lines.length < 8) {
    suggestions.push("The resume looks short; add education and relevant skills.");
  }
  return suggestions;
}

function polishText(text) {
  const cleaned = text
    .replace(/负责/g, "led")
    .replace(/协助/g, "partnered")
    .replace(/搭建/g, "built and iterated")
    .replace(/提升/g, "significantly improved");
  return `Polish Summary\n${cleaned}`;
}

async function parsePdf(file) {
  const pdfjsLib = window["pdfjs-dist/build/pdf"] || window.pdfjsLib;
  if (!pdfjsLib) {
    throw new Error("未加载 PDF.js");
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.min.js";
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    fullText += `${pageText}\n`;
  }
  return { text: fullText.trim(), pages: pdf.numPages };
}

function renderResults(text, pages) {
  const normalizedText = sanitizeText(text);
  rawTextEl.textContent = normalizedText || "No text extracted. Ensure the PDF contains selectable text.";
  rawTextEl.classList.toggle("empty", !normalizedText);

  const suggestions = generateSuggestions(text);
  suggestionsEl.innerHTML = "";
  if (suggestions.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Looks solid overall. Consider sharpening metrics and role-specific keywords.";
    suggestionsEl.appendChild(li);
  } else {
    suggestions.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      suggestionsEl.appendChild(li);
    });
  }
  suggestionsEl.classList.toggle("empty", suggestions.length === 0);

  polishedEl.textContent = polishText(text);
  polishedEl.classList.toggle("empty", !text);

  updateCounters({ pages, suggestions: suggestions.length, summary: Math.max(1, Math.round(text.length / 120)) });
}

uploadInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  setStatus("Parsing PDF...", "loading");
  try {
    const { text, pages } = await parsePdf(file);
    renderResults(text, pages);
    setStatus("Parsing complete. Suggestions and polish are ready.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Parsing failed. Try a different PDF or use sample content.", "error");
  }
});

demoButton.addEventListener("click", () => {
  renderResults(demoText, 1);
  setStatus("Sample content loaded.", "success");
});
