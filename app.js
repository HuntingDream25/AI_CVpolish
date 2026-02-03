const uploadInput = document.getElementById("resume-upload");
const statusText = document.getElementById("upload-status");
const rawTextEl = document.getElementById("raw-text");
const suggestionsEl = document.getElementById("suggestions");
const polishedEl = document.getElementById("polished");
const pageCountEl = document.getElementById("page-count");
const suggestionCountEl = document.getElementById("suggestion-count");
const summaryCountEl = document.getElementById("summary-count");
const demoButton = document.getElementById("demo-button");

const demoText = `王小明\n数据分析师｜3 年经验\n\n教育背景\n- 2018.09-2022.06 北京某大学 统计学 本科\n\n工作经历\n- 2022.07-至今 互联网公司 数据分析师\n  负责用户增长数据监控，搭建日报周报\n  协助产品团队优化转化漏斗\n\n项目经验\n- 搭建用户留存分析模型，提升次日留存 8%\n- 负责 BI 看板设计，支持多部门数据需求\n\n技能\nSQL / Python / Tableau / 数据可视化`;

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
    suggestions.push("建议加入可量化成果（如提升比例、金额、用户数）。");
  }
  if (!/项目|Project|项目经验/.test(text)) {
    suggestions.push("建议补充 2-3 个核心项目亮点。");
  }
  const hasActionVerb = /(负责|搭建|优化|提升|设计|交付)/.test(text);
  if (!hasActionVerb) {
    suggestions.push("建议使用动词开头描述职责，例如“负责/优化/推动”。");
  }
  if (lines.length < 8) {
    suggestions.push("内容偏少，可补充教育背景与技能关键词。");
  }
  return suggestions;
}

function polishText(text) {
  const cleaned = text
    .replace(/负责/g, "主导")
    .replace(/协助/g, "协同")
    .replace(/搭建/g, "搭建并迭代")
    .replace(/提升/g, "显著提升");
  return `润色摘要\n${cleaned}`;
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
  rawTextEl.textContent = normalizedText || "未提取到文本，请确认 PDF 中包含可复制文字。";
  rawTextEl.classList.toggle("empty", !normalizedText);

  const suggestions = generateSuggestions(text);
  suggestionsEl.innerHTML = "";
  if (suggestions.length === 0) {
    const li = document.createElement("li");
    li.textContent = "内容已较完整，可进一步优化量化指标与岗位关键词。";
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
  setStatus("正在解析 PDF...", "loading");
  try {
    const { text, pages } = await parsePdf(file);
    renderResults(text, pages);
    setStatus("解析完成，已生成建议与润色版本。", "success");
  } catch (error) {
    console.error(error);
    setStatus("解析失败，请尝试更换 PDF 或使用示例内容。", "error");
  }
});

demoButton.addEventListener("click", () => {
  renderResults(demoText, 1);
  setStatus("已加载示例内容。", "success");
});
