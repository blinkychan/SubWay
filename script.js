const form = document.querySelector("#submissionForm");
const presets = [...(window.SUBMISSION_PRESETS || [])].sort((a, b) =>
  a.project.localeCompare(b.project, undefined, { sensitivity: "base" })
);
const fields = {
  templateProject: document.querySelector("#templateProject"),
  project: document.querySelector("#project"),
  writer: document.querySelector("#writer"),
  agent: document.querySelector("#agent"),
  submittedTo: document.querySelector("#submittedTo"),
  date: document.querySelector("#date"),
  conversation: document.querySelector("#conversation"),
  submissionType: document.querySelector("#submissionType"),
  conversationName: document.querySelector("#conversationName"),
  materials: document.querySelector("#materials"),
  logline: document.querySelector("#logline"),
  link: document.querySelector("#link")
};

const conversationNameWrap = document.querySelector("#conversationNameWrap");
const linkWrap = document.querySelector("#linkWrap");
const subjectOutput = document.querySelector("#subjectOutput");
const emailPreview = document.querySelector("#emailPreview");
const plainOutput = document.querySelector("#plainOutput");
const copyStatus = document.querySelector("#copyStatus");

const storageKey = "submission-email-formatter-v2";
const oldStorageKey = "submission-email-formatter";

function todayValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(year, month - 1, day));
}

function titleCasePlaceholder(value, fallback) {
  return value.trim() || fallback;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function multilineHtml(value) {
  return escapeHtml(value).replaceAll("\n", "<br>");
}

function uppercaseProject(value) {
  return titleCasePlaceholder(value, "[Project Name]").toUpperCase();
}

function getDelivery() {
  return document.querySelector("input[name='delivery']:checked").value;
}

function buildDraft() {
  const project = uppercaseProject(fields.project.value);
  const writer = titleCasePlaceholder(fields.writer.value, "[Writer Name]");
  const agent = titleCasePlaceholder(fields.agent.value, "[Agent Name]");
  const submittedTo = titleCasePlaceholder(fields.submittedTo.value, writer);
  const date = formatDate(fields.date.value) || "[Date]";
  const materials = titleCasePlaceholder(fields.materials.value, "materials");
  const logline = titleCasePlaceholder(fields.logline.value, "[Logline]");
  const submissionType = fields.submissionType.value;
  const submissionArticle = submissionType === "exclusive" ? "an" : "a";
  const submissionLine = `This is ${submissionArticle} ${submissionType} submission.`;
  const delivery = getDelivery();
  const link = fields.link.value.trim();
  const conversation =
    fields.conversation.value === "your conversation with"
      ? `your conversation with ${titleCasePlaceholder(fields.conversationName.value, "[Name]")}`
      : "our conversation";

  const subject = `SUBMISSION // ${project} - ${writer}`;
  const intro = `Per ${conversation}, attached please find ${materials} for ${project} for ${writer} to review.`;
  const deliveryLine = delivery === "link" ? link || "[Link]" : "";

  const bodyParts = [
    "VIA EMAIL",
    "",
    date,
    "",
    submittedTo,
    "",
    `RE:      ${project}`,
    "",
    `Dear ${agent},`,
    "",
    intro,
    "",
    submissionLine,
    "",
    `Logline: ${logline}`
  ];

  if (deliveryLine) {
    bodyParts.push("", deliveryLine);
  }

  bodyParts.push("", "We look forward to hearing your thoughts!");

  return {
    subject,
    body: bodyParts.join("\n"),
    html: `
      <p class="via" style="font-weight: 700; font-style: italic; text-decoration: underline;">VIA EMAIL</p>
      <p>${escapeHtml(date)}</p>
      <p>${escapeHtml(submittedTo)}</p>
      <p class="re-line" style="font-weight: 700; font-style: italic; text-decoration: underline;">RE:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${escapeHtml(project)}</p>
      <p>Dear ${escapeHtml(agent)},</p>
      <p>${escapeHtml(intro)}</p>
      <p>${escapeHtml(submissionLine)}</p>
      <p><span class="logline-label" style="font-weight: 700;">Logline:</span> <span class="logline-text" style="font-style: italic;">${multilineHtml(logline)}</span></p>
      ${deliveryLine ? `<p class="link" style="color: #467886; text-decoration: underline;">${escapeHtml(deliveryLine)}</p>` : ""}
      <p>We look forward to hearing your thoughts!</p>
    `
  };
}

function populatePresetOptions() {
  presets.forEach((preset, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = preset.project;
    fields.templateProject.append(option);
  });
}

function setDelivery(value) {
  const delivery = document.querySelector(`input[name='delivery'][value='${value}']`);
  if (delivery) delivery.checked = true;
}

function applyPreset(index) {
  const preset = presets[Number(index)];
  if (!preset) return;

  fields.project.value = preset.project || "";
  fields.logline.value = preset.logline || "";
  fields.materials.value = preset.materials || "";
  fields.link.value = preset.link || "";
  setDelivery(preset.link ? "link" : "attachment");
}

function saveState() {
  const data = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value]));
  data.delivery = getDelivery();
  localStorage.setItem(storageKey, JSON.stringify(data));
}

function render() {
  conversationNameWrap.classList.toggle("is-visible", fields.conversation.value === "your conversation with");
  linkWrap.classList.toggle("is-visible", getDelivery() === "link");

  const draft = buildDraft();
  subjectOutput.textContent = draft.subject;
  emailPreview.innerHTML = draft.html;
  plainOutput.value = draft.body;
  saveState();
}

async function copyText(text, label) {
  await navigator.clipboard.writeText(text);
  copyStatus.textContent = `${label} copied.`;
  window.setTimeout(() => {
    copyStatus.textContent = "";
  }, 1800);
}

async function copyBody() {
  const html = `
    <div style="font-family: Aptos, Calibri, Arial, sans-serif; font-size: 11pt; color: #212121;">
      ${emailPreview.innerHTML}
    </div>
  `;

  if (window.ClipboardItem) {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plainOutput.value], { type: "text/plain" })
      })
    ]);
  } else {
    await navigator.clipboard.writeText(plainOutput.value);
  }

  copyStatus.textContent = "Body copied.";
  window.setTimeout(() => {
    copyStatus.textContent = "";
  }, 1800);
}

function openEmailDraft() {
  const subject = encodeURIComponent(subjectOutput.textContent);
  const body = encodeURIComponent(plainOutput.value);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function openOutlookDraft() {
  const subject = encodeURIComponent(subjectOutput.textContent);
  const body = encodeURIComponent(plainOutput.value);
  window.location.href = `ms-outlook://compose?subject=${subject}&body=${body}`;
}

function restoreState() {
  localStorage.removeItem(oldStorageKey);
  fields.date.value = todayValue();
  const saved = localStorage.getItem(storageKey);
  if (!saved) return;

  try {
    const data = JSON.parse(saved);
    Object.entries(fields).forEach(([key, field]) => {
      if (key !== "date" && data[key] !== undefined) field.value = data[key];
    });
    fields.date.value = todayValue();
    if (data.delivery) {
      setDelivery(data.delivery);
    }
  } catch {
    localStorage.removeItem(storageKey);
  }
}

form.addEventListener("input", render);
form.addEventListener("change", render);

fields.templateProject.addEventListener("change", () => {
  if (fields.templateProject.value !== "") {
    applyPreset(fields.templateProject.value);
  }
  render();
});

document.querySelector("#copySubject").addEventListener("click", () => {
  copyText(subjectOutput.textContent, "Subject");
});

document.querySelector("#copyBody").addEventListener("click", () => {
  copyBody();
});

document.querySelector("#openEmail").addEventListener("click", () => {
  openEmailDraft();
});

document.querySelector("#openOutlook").addEventListener("click", () => {
  openOutlookDraft();
});

document.querySelector("#clearButton").addEventListener("click", () => {
  form.reset();
  fields.date.value = todayValue();
  localStorage.removeItem(storageKey);
  render();
});

populatePresetOptions();
restoreState();
render();
