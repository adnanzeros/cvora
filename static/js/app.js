const STORAGE_KEY = 'cvoraState';
const LANGUAGE_KEY = 'cvoraLanguage';
let saveTimer;
let renderTimer;

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function clearSignatureDrawing() {
  const canvas = document.getElementById('signaturePad');
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  state.signatureData = '';
}

const defaultState = {
  template: 'bangladesh',
  fullName: '',
  phone: '',
  email: '',
  fatherName: '',
  motherName: '',
  dob: '',
  gender: '',
  bloodGroup: '',
  nationality: '',
  maritalStatus: '',
  religion: '',
  presentAddress: '',
  permanentAddress: '',
  summary: '',
  skills: '',
  training: '',
  hobbies: '',
  declaration: '',
  signature: '',
  signatureData: '',
  authoritySignature: '',
  title: '',
  linkedin: '',
  website: '',
  targetRole: '',
  targetCountry: '',
  jobDescription: '',
  targetMarket: 'Bangladesh',
  education: [],
  experience: [],
  projects: [],
  languages: [],
  references: [],
  photoData: ''
};

const templateNames = {
  bangladesh: 'Bangladesh Standard CV',
  europe: 'European-Style CV',
  international: 'International Professional CV',
  modern: 'Modern Professional CV'
};

const translations = {
  en: {
    exportPdf: 'Export PDF',
    editPreview: 'Edit / Preview',
    autosaved: 'Autosaved',
    saveStatus: 'Saved',
    template: 'Template',
    missingInfo: 'Missing required Bangladesh information will be highlighted below.'
  },
  bn: {
    exportPdf: 'পিডিএফ এক্সপোর্ট',
    editPreview: 'সম্পাদনা / প্রিভিউ',
    autosaved: 'স্বয়ংক্রিয়ভাবে সংরক্ষিত',
    saveStatus: 'সংরক্ষিত',
    template: 'টেমপ্লেট',
    missingInfo: 'বাংলাদেশ স্ট্যান্ডার্ড সিভির প্রয়োজনীয় তথ্য অনুপস্থিত হলে এখানে দেখানো হবে।'
  }
};

let currentLanguage = 'en';
try {
  currentLanguage = localStorage.getItem(LANGUAGE_KEY) || 'en';
} catch (error) {
  currentLanguage = 'en';
}
let state = loadState();

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function cvValue(value, hint) {
  return String(value || '').trim()
    ? escapeHtml(value)
    : `<span class="cv-hint">[${escapeHtml(hint)}]</span>`;
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return cloneData(defaultState);
    const loaded = JSON.parse(stored);
    const merged = {
      ...cloneData(defaultState),
      ...loaded,
      education: loaded.education || cloneData(defaultState.education),
      experience: loaded.experience || cloneData(defaultState.experience),
      projects: loaded.projects || [],
      languages: loaded.languages || cloneData(defaultState.languages),
      references: loaded.references || cloneData(defaultState.references)
    };
    merged.experience = merged.experience.map((item) => {
      if (item.startDate || item.endDate || item.currentlyWorking !== undefined) return item;
      const years = String(item.period || '').match(/\b(?:19|20)\d{2}\b/g) || [];
      return {
        ...item,
        startDate: years[0] ? `${years[0]}-01` : '',
        endDate: years[1] ? `${years[1]}-12` : '',
        currentlyWorking: /present|current/i.test(item.period || '')
      };
    });
    return merged;
  } catch (error) {
    return cloneData(defaultState);
  }
}

function persistState() {
  const el = document.getElementById('saveState');
  if (el) {
    el.textContent = 'Saving…';
    el.classList.remove('save-error');
  }
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.setItem(LANGUAGE_KEY, currentLanguage);
      updateSaveStatus();
    } catch (error) {
      if (el) {
        el.textContent = 'Save failed — storage may be full';
        el.classList.add('save-error');
      }
    }
  }, 250);
}

function saveNow() {
  window.clearTimeout(saveTimer);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(LANGUAGE_KEY, currentLanguage);
    updateSaveStatus();
  } catch (error) {
    const el = document.getElementById('saveState');
    if (el) {
      el.textContent = 'Save failed — storage may be full';
      el.classList.add('save-error');
    }
  }
}

function updateSaveStatus() {
  const el = document.getElementById('saveState');
  if (!el) return;
  el.textContent = (translations[currentLanguage] || translations.en).saveStatus;
}

function applyLanguage(lang) {
  currentLanguage = translations[lang] ? lang : 'en';
  const labels = translations[currentLanguage];
  const exportBtn = document.getElementById('exportPdfBtn');
  const toggleBtn = document.getElementById('togglePreviewBtn');
  const validationMessage = document.getElementById('validationMessage');
  if (exportBtn) exportBtn.textContent = labels.exportPdf;
  if (toggleBtn) toggleBtn.textContent = labels.editPreview;
  if (validationMessage && state.template === 'bangladesh') validationMessage.textContent = labels.missingInfo;
  const selector = document.getElementById('languageSelector');
  if (selector) selector.value = lang;
  updateSaveStatus();
}

function fillSimpleFields() {
  document.querySelectorAll('[data-field]:not([data-collection])').forEach((input) => {
    const field = input.dataset.field;
    if (Object.prototype.hasOwnProperty.call(state, field)) {
      input.value = state[field] ?? '';
    }
  });
  const photoPreview = document.getElementById('photoPreview');
  const photoWrap = document.getElementById('photoPreviewWrap');
  const placeholder = document.getElementById('photoPlaceholder');
  if (state.photoData) {
    photoPreview.src = state.photoData;
    photoWrap.classList.add('has-photo');
    placeholder.style.display = 'none';
  } else {
    photoPreview.removeAttribute('src');
    photoWrap.classList.remove('has-photo');
    placeholder.style.display = 'block';
  }
  restoreSignaturePad();
}

function restoreSignaturePad() {
  const canvas = document.getElementById('signaturePad');
  if (!canvas) return;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#111827';
  context.lineWidth = 3;
  context.lineCap = 'round';
  if (!state.signatureData) return;
  const image = new Image();
  image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.src = state.signatureData;
}

function renderCollection(containerId, collectionName, fields) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!state[collectionName] || !state[collectionName].length) {
    container.innerHTML = '<p class="summary-note">No entries yet.</p>';
    return;
  }

  container.innerHTML = state[collectionName].map((item, index) => {
    const row = fields.map((field) => {
      const value = item[field] || '';
      if (field === 'currentlyWorking') {
        return `<label class="checkbox-field"><input type="checkbox" data-collection="${collectionName}" data-index="${index}" data-field="${field}" ${item[field] ? 'checked' : ''} /> I currently work here</label>`;
      }
      if (field === 'details') {
        return `
          <label class="entry-wide">
            ${fieldLabels[field] || field}
            <textarea data-collection="${collectionName}" data-index="${index}" data-field="${field}" rows="3">${escapeHtml(value)}</textarea>
          </label>
        `;
      }
      const type = field === 'startDate' || field === 'endDate' ? 'month' : 'text';
      return `
        <label class="${field === 'description' ? 'entry-wide' : ''}">
          ${fieldLabels[field] || field}
          <input type="${type}" data-collection="${collectionName}" data-index="${index}" data-field="${field}" value="${escapeHtml(value)}" ${field === 'endDate' && item.currentlyWorking ? 'disabled' : ''} />
        </label>
      `;
    }).join('');
    return `
      <div class="entry-card">
        <div class="entry-topline">
          <strong>${escapeHtml(item[fields[0]] || `${collectionName.slice(0, -1)} ${index + 1}`)}</strong>
          <div class="entry-actions">
            <button type="button" class="icon-action" aria-label="Move entry up" title="Move up" data-move="${collectionName}" data-index="${index}" data-direction="-1" ${index === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" class="icon-action" aria-label="Move entry down" title="Move down" data-move="${collectionName}" data-index="${index}" data-direction="1" ${index === state[collectionName].length - 1 ? 'disabled' : ''}>↓</button>
            <button type="button" class="remove-entry-btn" data-remove="${collectionName}" data-index="${index}">Remove</button>
          </div>
        </div>
        <div class="field-grid">${row}</div>
      </div>
    `;
  }).join('');
}

const fieldLabels = {
  qualification: 'Qualification',
  institution: 'Institution',
  subject: 'Subject / major',
  date: 'Dates',
  result: 'Grade / result',
  role: 'Job title',
  organization: 'Organization',
  startDate: 'Start date',
  endDate: 'End date',
  currentlyWorking: 'Employment status',
  details: 'Description',
  projectName: 'Project name',
  language: 'Language',
  level: 'Level',
  name: 'Name',
  title: 'Role / title',
  contact: 'Contact info'
};

function renderRepeatables() {
  renderCollection('educationList', 'education', ['qualification', 'institution', 'subject', 'date', 'result']);
  renderCollection('experienceList', 'experience', ['role', 'organization', 'startDate', 'endDate', 'currentlyWorking', 'details']);
  renderCollection('projectList', 'projects', ['projectName', 'period', 'details']);
  renderCollection('languageList', 'languages', ['language', 'level']);
  renderCollection('referenceList', 'references', ['name', 'title', 'contact']);
}

function addEntry(collectionName) {
  const templates = {
    education: { qualification: '', institution: '', subject: '', date: '', result: '' },
    experience: { role: '', organization: '', startDate: '', endDate: '', currentlyWorking: false, details: '' },
    projects: { projectName: '', period: '', details: '' },
    languages: { language: '', level: '' },
    references: { name: '', title: '', contact: '' }
  };
  if (!state[collectionName]) state[collectionName] = [];
  state[collectionName].push(cloneData(templates[collectionName]));
  persistState();
  syncFromState();
}

function removeEntry(collectionName, index) {
  if (!state[collectionName]) return;
  state[collectionName].splice(index, 1);
  persistState();
  syncFromState();
}

function moveEntry(collectionName, index, direction) {
  const entries = state[collectionName];
  const destination = index + direction;
  if (!entries || destination < 0 || destination >= entries.length) return;
  [entries[index], entries[destination]] = [entries[destination], entries[index]];
  persistState();
  syncFromState();
}

function syncFromState() {
  fillSimpleFields();
  renderRepeatables();
  renderPreview();
  validateTemplate();
}

function updateStateFromInput(target) {
  const collection = target.dataset.collection;
  const field = target.dataset.field;
  const index = Number(target.dataset.index);

  if (collection) {
    if (!state[collection] || !state[collection][index]) return;
    state[collection][index][field] = target.type === 'checkbox' ? target.checked : target.value;
    if (field === 'currentlyWorking' && target.checked) {
      state[collection][index].endDate = '';
      const endDate = target.closest('.entry-card')?.querySelector('[data-field="endDate"]');
      if (endDate) {
        endDate.value = '';
        endDate.disabled = true;
      }
    } else if (field === 'currentlyWorking') {
      const endDate = target.closest('.entry-card')?.querySelector('[data-field="endDate"]');
      if (endDate) endDate.disabled = false;
    }
  } else {
    state[field] = target.value;
    if (field === 'signature' && target.value.trim()) clearSignatureDrawing();
  }
  persistState();
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(() => {
    renderPreview();
    validateTemplate();
  }, 100);
}

function validateTemplate() {
  const validationMessage = document.getElementById('validationMessage');
  if (!validationMessage) return;

  if (state.template !== 'bangladesh') {
    validationMessage.textContent = 'This template keeps optional international details configurable.';
    return;
  }

  const required = [
    'fullName', 'phone', 'email', 'fatherName', 'motherName', 'dob', 'gender', 'bloodGroup', 'nationality', 'maritalStatus', 'presentAddress', 'permanentAddress'
  ];
  const missing = required.filter((field) => !String(state[field] || '').trim());
  if (!state.photoData) missing.push('photo');
  if (missing.length) {
    validationMessage.textContent = 'Missing required Bangladesh fields: ' + missing.join(', ');
    validationMessage.style.borderLeftColor = '#b45309';
    validationMessage.style.background = '#fff7ed';
    validationMessage.style.color = '#9a4d00';
  } else {
    validationMessage.textContent = 'All required Bangladesh fields are present.';
    validationMessage.style.borderLeftColor = '#1f9d61';
    validationMessage.style.background = '#ecfdf5';
    validationMessage.style.color = '#166534';
  }
}

function dateValue(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})$/);
  return match ? Number(match[1]) * 100 + Number(match[2]) : null;
}

function tokenize(value) {
  const stopWords = new Set(['about', 'after', 'also', 'and', 'are', 'for', 'from', 'have', 'into', 'more', 'our', 'that', 'the', 'their', 'this', 'will', 'with', 'you', 'your', 'who', 'work', 'years', 'role', 'team']);
  return [...new Set(String(value || '').toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) || [])]
    .filter((word) => !stopWords.has(word));
}

function analyzeLocalCV() {
  const recommendations = [];
  const requiredContact = ['fullName', 'phone', 'email'];
  const missingContact = requiredContact.filter((field) => !String(state[field] || '').trim());
  if (missingContact.length) recommendations.push(`Complete contact information: ${missingContact.map((field) => field === 'fullName' ? 'name' : field).join(', ')}.`);
  if (state.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) recommendations.push('Check the email address format.');

  if (state.template === 'bangladesh') {
    const requiredFields = ['fatherName', 'motherName', 'dob', 'gender', 'bloodGroup', 'nationality', 'maritalStatus', 'presentAddress', 'permanentAddress'];
    const missing = requiredFields.filter((field) => !String(state[field] || '').trim());
    if (missing.length) recommendations.push(`Bangladesh template details still need information: ${missing.join(', ')}.`);
    if (!state.photoData) recommendations.push('Add a photo for the Bangladesh Standard CV. Its header reserves a fixed photo frame.');
    if (!String(state.declaration || '').trim()) recommendations.push('Add declaration text; this section remains part of the Bangladesh template.');
    if (!String(state.signature || '').trim()) recommendations.push('Add the applicant signature or name in the signature field.');
  }

  if (!String(state.summary || '').trim()) recommendations.push('Add a concise professional summary or career objective.');
  else if (String(state.summary).trim().split(/\s+/).length > 90) recommendations.push('Consider shortening the summary to around 90 words for easier scanning.');
  if (/\s{2,}/.test(String(state.summary || ''))) recommendations.push('Remove repeated spaces in the summary to improve document consistency.');

  if (!(state.education || []).some((item) => item.qualification || item.institution)) {
    recommendations.push('Add at least one education record with a qualification and institution.');
  }
  (state.education || []).forEach((item, index) => {
    if ((item.qualification || item.date || item.result) && !String(item.institution || '').trim()) {
      recommendations.push(`Education entry ${index + 1} is missing its institution.`);
    }
  });

  if (!(state.experience || []).some((item) => item.role || item.organization || item.details)) {
    recommendations.push('Add experience if relevant; otherwise, emphasize education, projects, or training.');
    if ((state.education || []).some((item) => item.qualification || item.institution)) {
      recommendations.push('Education is your strongest completed section so far; consider placing it before experience for this early-career CV.');
    }
  }
  (state.experience || []).forEach((item, index) => {
    const hasAny = item.role || item.organization || item.startDate || item.endDate || item.details;
    if (!hasAny) return;
    if (!String(item.role || '').trim()) recommendations.push(`Experience entry ${index + 1} needs a job title.`);
    if (!String(item.organization || '').trim()) recommendations.push(`Experience entry ${index + 1} needs an employer or organization.`);
    if (!item.startDate) recommendations.push(`Experience entry ${index + 1} is missing a start date.`);
    const start = dateValue(item.startDate);
    const end = dateValue(item.endDate);
    if (start && end && end < start) recommendations.push(`Experience entry ${index + 1} ends before it starts; check the dates.`);
    if (!item.currentlyWorking && item.startDate && !item.endDate) recommendations.push(`Add an end date or mark experience entry ${index + 1} as current.`);
    if (!String(item.details || '').trim()) recommendations.push(`Add a short, factual description to experience entry ${index + 1}.`);
  });

  (state.languages || []).forEach((item, index) => {
    if (item.language && !item.level) recommendations.push(`Choose a proficiency level for language entry ${index + 1}.`);
  });
  (state.references || []).forEach((item, index) => {
    if (item.name && (!item.title || !item.contact)) recommendations.push(`Reference entry ${index + 1} is incomplete; add the missing role or contact details.`);
  });

  const description = state.jobDescription || '';
  let keywordSummary = null;
  if (description.trim()) {
    const jobTerms = tokenize(description).filter((term) => term.length >= 4);
    const cvText = [
      state.summary, state.skills, state.training, state.title,
      ...(state.experience || []).flatMap((item) => [item.role, item.organization, item.details]),
      ...(state.projects || []).flatMap((item) => [item.projectName, item.details]),
      ...(state.education || []).flatMap((item) => [item.qualification, item.subject, item.institution])
    ].join(' ').toLowerCase();
    const present = jobTerms.filter((term) => cvText.includes(term));
    const missing = jobTerms.filter((term) => !cvText.includes(term));
    keywordSummary = { present: present.slice(0, 10), missing: missing.slice(0, 10), total: jobTerms.length };
    if (missing.length) recommendations.push(`Review the job description's terms (${missing.slice(0, 5).join(', ')}). Add them only where they truthfully describe your experience.`);
  }

  const pageNodes = [...document.querySelectorAll('#cvPreview .cv-page')];
  const overflowing = pageNodes.some((page) => page.scrollHeight > page.clientHeight + 8);
  const overflowingSections = [...new Set(pageNodes.flatMap((page) => {
    const pageBottom = page.getBoundingClientRect().bottom;
    return [...page.querySelectorAll('.section-block, .meta-box, .decl-box')]
      .filter((section) => section.getBoundingClientRect().bottom > pageBottom + 2)
      .map((section) => section.querySelector('h3')?.textContent.trim())
      .filter(Boolean);
  }))];
  if (overflowing) {
    const sectionNames = overflowingSections.length ? ` Sections near the boundary: ${overflowingSections.join(', ')}.` : '';
    recommendations.push(`Content exceeds the visible page area.${sectionNames} Shorten or reorganize it; CVora will not remove content automatically.`);
  }

  return { recommendations, keywordSummary, overflowing, overflowingSections, pageCount: pageNodes.length };
}

function renderAssistant() {
  const analysis = analyzeLocalCV();
  window.cvoraAnalysis = analysis;
  const list = document.getElementById('reviewList');
  const score = document.getElementById('qualityScore');
  const keywordResults = document.getElementById('keywordResults');
  const suggestion = document.getElementById('summarySuggestion');
  if (!list || !score || !keywordResults || !suggestion) return;

  const count = analysis.recommendations.length;
  score.textContent = count ? `${count} item${count === 1 ? '' : 's'} to review` : 'Looking complete';
  score.classList.toggle('score-good', !count);
  list.innerHTML = count
    ? analysis.recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    : '<li class="review-good">Your CV has no issues detected by the current local checks.</li>';

  if (analysis.keywordSummary) {
    const { present, missing, total } = analysis.keywordSummary;
    keywordResults.innerHTML = `
      <p>${present.length} of ${total} detected terms also appear in your CV content.</p>
      <div><strong>Found:</strong> ${present.length ? present.map(escapeHtml).join(' · ') : 'No matching terms detected yet.'}</div>
      <div><strong>Review:</strong> ${missing.length ? missing.map(escapeHtml).join(' · ') : 'No unmatched terms detected.'}</div>
      <small>Local keyword comparison is a simple text check, not an ATS score or hiring prediction.</small>
    `;
  } else {
    keywordResults.innerHTML = '<p>Paste a job description to see local term overlap. Nothing is sent to a server.</p>';
  }

  const role = String(state.targetRole || state.title || '').trim();
  const skills = String(state.skills || '').split(',').map((skill) => skill.trim()).filter(Boolean).slice(0, 3);
  if (role || skills.length) {
    const rolePart = role ? `a ${role}` : 'a suitable role';
    const skillPart = skills.length ? ` My listed skills include ${skills.join(', ')}.` : '';
    suggestion.textContent = `Seeking ${rolePart} where I can contribute to meaningful work and continue developing professionally.${skillPart}`;
  } else {
    suggestion.textContent = 'Add a target role or skills to get a starter based only on your information.';
  }
}

function setTemplate(templateId) {
  if (!Object.prototype.hasOwnProperty.call(templateNames, templateId)) return;
  state.template = templateId;
  const cards = document.querySelectorAll('.template-card');
  cards.forEach((card) => card.classList.toggle('active', card.dataset.template === templateId));
  document.getElementById('currentTemplateLabel').textContent = templateNames[templateId] || 'CV Template';
  persistState();
  renderPreview();
  validateTemplate();
  renderAssistant();
}

function formatWorkPeriod(item) {
  const format = (value) => {
    const match = String(value || '').match(/^(\d{4})-(\d{2})$/);
    return match ? new Date(Number(match[1]), Number(match[2]) - 1).toLocaleDateString('en', { month: 'short', year: 'numeric' }) : value;
  };
  const start = format(item.startDate || '');
  const end = item.currentlyWorking ? 'Present' : format(item.endDate || '');
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

function renderProjectSection() {
  const projects = (state.projects || []).filter((item) => item.projectName || item.period || item.details);
  if (!projects.length) return '';
  return `
    <div class="section-block">
      <h3>Projects</h3>
      <div class="entry-list">${projects.map((item) => `
        <div class="entry-item">
          <strong>${escapeHtml(item.projectName || 'Project')}</strong>
          <div class="entry-meta">${escapeHtml(item.period || '')}</div>
          <div>${escapeHtml(item.details || '')}</div>
        </div>
      `).join('')}</div>
    </div>
  `;
}

function applySuggestion(type) {
  const role = String(state.targetRole || state.title || '').trim();
  const skills = String(state.skills || '').split(',').map((skill) => skill.trim()).filter(Boolean).slice(0, 3);
  const actualRoles = (state.experience || []).map((item) => item.role).filter(Boolean);
  const roleText = role || 'a suitable role';
  const skillText = skills.length ? ` Relevant skills I have listed include ${skills.join(', ')}.` : '';
  const experienceText = type === 'experienced' && actualRoles.length
    ? ` My experience includes ${actualRoles.join(', ')}.`
    : '';
  const nextValue = `Seeking ${roleText} where I can contribute to meaningful work and continue developing professionally.${experienceText}${skillText}`;
  if (!nextValue) return;
  if (state.summary && state.summary.trim() && !window.confirm('Replace the current summary with the suggestion?')) {
    return;
  }
  state.summary = nextValue;
  document.querySelector('[data-field="summary"]').value = nextValue;
  persistState();
  renderPreview();
}

function renderPreview() {
  const preview = document.getElementById('cvPreview');
  if (!preview) return;

  const template = state.template || 'bangladesh';
  const complexity = (state.summary || '').length / 180
    + (state.declaration || '').length / 220
    + (state.skills || '').length / 240
    + (state.education || []).length * 0.6
    + (state.experience || []).length * 0.85
    + (state.projects || []).length * 0.6
    + (state.references || []).length * 0.4;
  preview.dataset.density = complexity > 5 ? 'compact' : 'normal';
  let markup = '';

  if (template === 'bangladesh') {
    markup = renderBangladeshPreview();
  } else if (template === 'europe') {
    markup = renderEuropeanPreview();
  } else if (template === 'international') {
    markup = renderInternationalPreview();
  } else {
    markup = renderModernPreview();
  }

  preview.innerHTML = markup;
  preview.querySelectorAll('.cv-page').forEach((page) => {
    const width = page.getBoundingClientRect().width;
    if (width > 0) page.style.height = `${width * 297 / 210}px`;
  });
  const initiallyOverflows = [...preview.querySelectorAll('.cv-page')]
    .some((page) => page.scrollHeight > page.clientHeight + 8);
  if (initiallyOverflows && preview.dataset.density !== 'compact') {
    preview.dataset.density = 'compact';
  }
  const warning = document.getElementById('warningBox');
  if (warning) {
    const overflowRisk = (state.summary || '').length > 250 || (state.declaration || '').length > 220 || (state.skills || '').length > 300;
    warning.classList.toggle('visible', overflowRisk);
  }
  renderAssistant();
}

function renderBangladeshPreview() {
  const education = state.education?.map((item) => `
    <div class="entry-item">
      <strong>${cvValue(item.qualification, 'Qualification')}</strong>
      <div>${cvValue(item.institution, 'Institution')}</div>
      <div>${cvValue(item.subject, 'Subject')}</div>
      <div class="entry-meta">
        <span>${cvValue(item.date, 'Dates')}</span>
        <span>${cvValue(item.result, 'Result')}</span>
      </div>
    </div>
  `).join('') || '<div class="entry-item"><span class="cv-hint">[Add education details]</span></div>';

  const experience = state.experience?.map((item) => `
    <div class="entry-item">
      <strong>${cvValue(item.role, 'Role')}</strong>
      <div>${cvValue(item.organization, 'Organization')}</div>
      <div class="entry-meta"><span>${escapeHtml(formatWorkPeriod(item))}</span></div>
      <div>${cvValue(item.details, 'Description')}</div>
    </div>
  `).join('') || '<div class="entry-item"><span class="cv-hint">[Add experience details]</span></div>';

  const languages = state.languages?.map((item) => `<li class="lang-item"><strong>${cvValue(item.language, 'Language')}</strong> — ${cvValue(item.level, 'Proficiency level')}</li>`).join('') || '<li><span class="cv-hint">[Add language proficiency]</span></li>';
  const references = state.references?.map((item) => `<li>${cvValue(item.name, 'Reference name')} — ${cvValue(item.title, 'Role')} — ${cvValue(item.contact, 'Contact')}</li>`).join('') || '<li><span class="cv-hint">[Add a reference]</span></li>';

  const photoMarkup = state.photoData ? `<img src="${state.photoData}" alt="Photo" />` : '<span class="cv-hint">[Photo required]</span>';
  const summaryText = cvValue(state.summary, 'Add a career objective or summary');
  const declarationText = cvValue(state.declaration, 'Add declaration text');
  const signatureMark = state.signatureData
    ? `<img class="signature-image" src="${state.signatureData}" alt="Applicant's drawn signature" />`
    : cvValue(state.signature, 'Add applicant signature');
  const religionRow = state.religion
    ? `<div class="meta-row"><strong>Religion</strong><span>${escapeHtml(state.religion)}</span></div>`
    : '';
  const authoritySignature = state.authoritySignature
    ? `<div><span>Authority Signature</span><div class="line"></div><strong>${escapeHtml(state.authoritySignature)}</strong></div>`
    : '';

  return `
    <div class="cv-sheet bangladesh-template">
      <div class="cv-page bangladesh-page-1">
        <header class="bangladesh-header">
          <div class="identity">
            <h2>${cvValue(state.fullName, 'Your full name')}</h2>
            <div class="title">${cvValue(state.title, 'Professional title')}</div>
            <ul class="contact-list">
              <li>${cvValue(state.phone, 'Phone number')}</li>
              <li>${cvValue(state.email, 'Email address')}</li>
              <li>${cvValue(state.presentAddress, 'Present address')}</li>
            </ul>
          </div>
          <div class="photo-frame">${photoMarkup}</div>
        </header>
        <div class="bangladesh-grid">
          <aside class="info-column">
            <div class="meta-box">
              <h3>Personal Information</h3>
              <div class="meta-table">
                <div class="meta-row"><strong>Father</strong><span>${cvValue(state.fatherName, 'Not provided')}</span></div>
                <div class="meta-row"><strong>Mother</strong><span>${cvValue(state.motherName, 'Not provided')}</span></div>
                <div class="meta-row"><strong>DOB</strong><span>${cvValue(state.dob, 'Not provided')}</span></div>
                <div class="meta-row"><strong>Gender</strong><span>${cvValue(state.gender, 'Not provided')}</span></div>
                <div class="meta-row"><strong>Blood</strong><span>${cvValue(state.bloodGroup, 'Not provided')}</span></div>
                <div class="meta-row"><strong>Nationality</strong><span>${cvValue(state.nationality, 'Not provided')}</span></div>
                <div class="meta-row"><strong>Marital</strong><span>${cvValue(state.maritalStatus, 'Not provided')}</span></div>
                ${religionRow}
              </div>
            </div>
            <div class="meta-box">
              <h3>Address</h3>
              <div class="meta-table">
                <div class="meta-row"><strong>Present</strong><span>${cvValue(state.presentAddress, 'Not provided')}</span></div>
                <div class="meta-row"><strong>Permanent</strong><span>${cvValue(state.permanentAddress, 'Not provided')}</span></div>
              </div>
            </div>
            <div class="meta-box">
              <h3>Language Proficiency</h3>
              <ul class="lang-list">${languages}</ul>
            </div>
          </aside>
          <div class="content-column">
            <div class="section-block">
              <h3>Career Objective</h3>
              <p class="summary-text">${summaryText}</p>
            </div>
            <div class="section-block">
              <h3>Education</h3>
              <div class="entry-list">${education}</div>
            </div>
            <div class="section-block">
              <h3>Work Experience</h3>
              <div class="entry-list">${experience}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="cv-page bangladesh-page-2">
        <div class="section-block">
          <h3>Skills</h3>
          <p>${cvValue(state.skills, 'Add skills')}</p>
        </div>
        <div class="section-block">
          <h3>Additional Information / Training</h3>
          <p>${cvValue(state.training, 'Add training or additional information')}</p>
        </div>
        ${renderProjectSection()}
        <div class="section-block">
          <h3>Interests &amp; Hobbies</h3>
          <p>${cvValue(state.hobbies, 'Add interests and hobbies')}</p>
        </div>
        <div class="section-block">
          <h3>References</h3>
          <ul class="ref-list">${references}</ul>
        </div>
        <div class="decl-box">
          <h3>Declaration</h3>
          <p>${declarationText}</p>
          <div class="signature-line">
            <div>
              <span>Applicant Signature</span>
              <div class="line"></div>
              <strong>${signatureMark}</strong>
            </div>
            ${authoritySignature}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderEuropeanPreview() {
  const summary = cvValue(state.summary, 'Add a professional summary');
  const skillItems = (state.skills || '').split(',').map((item) => item.trim()).filter(Boolean);
  const skills = skillItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li><span class="cv-hint">[Add skills]</span></li>';
  const education = state.education?.map((item) => `
    <div class="entry-item">
      <strong>${cvValue(item.qualification, 'Qualification')}</strong>
      <div>${cvValue(item.institution, 'Institution')}</div>
      <div class="entry-meta"><span>${cvValue(item.date, 'Dates')}</span><span>${cvValue(item.result, 'Result')}</span></div>
    </div>
  `).join('') || '<div class="entry-item"><span class="cv-hint">[Add education]</span></div>';
  const experience = state.experience?.map((item) => `
    <div class="entry-item">
      <strong>${cvValue(item.role, 'Role')}</strong>
      <div>${cvValue(item.organization, 'Organization')}</div>
      <div class="entry-meta"><span>${escapeHtml(formatWorkPeriod(item))}</span></div>
      <div>${cvValue(item.details, 'Description')}</div>
    </div>
  `).join('') || '<div class="entry-item"><span class="cv-hint">[Add relevant experience]</span></div>';
  const languages = state.languages?.map((item) => `<li>${cvValue(item.language, 'Language')}: ${cvValue(item.level, 'Proficiency level')}</li>`).join('') || '<li><span class="cv-hint">[Add languages]</span></li>';
  const experienceSection = `<div class="section-block"><h3>Experience</h3><div class="entry-list">${experience}</div></div>`;
  const educationSection = `<div class="section-block"><h3>Education</h3><div class="entry-list">${education}</div></div>`;
  const orderedSections = (state.experience || []).some((item) => item.role || item.organization || item.details)
    ? `${experienceSection}${educationSection}`
    : `${educationSection}${experienceSection}`;

  return `
    <div class="cv-sheet europe-template">
      <div class="cv-page">
        <header class="core-header">
          <div>
            <h2>${cvValue(state.fullName, 'Your full name')}</h2>
            <div>${cvValue(state.title, 'Professional title')}</div>
          </div>
          ${state.photoData ? `<img class="optional-cv-photo" src="${state.photoData}" alt="Optional profile photo" />` : ''}
          <div class="core-meta">
            <div>${escapeHtml(state.email || 'Email')}</div>
            <div>${escapeHtml(state.phone || 'Phone')}</div>
            <div>${escapeHtml(state.presentAddress || 'Address')}</div>
          </div>
        </header>
        <div class="two-column">
          <aside class="side-panel">
            <div class="section-block">
              <h3>Profile</h3>
              <p>${summary}</p>
            </div>
            <div class="section-block">
              <h3>Skills</h3>
              <ul class="skill-list">${skills}</ul>
            </div>
            <div class="section-block">
              <h3>Languages</h3>
              <ul class="lang-list">${languages}</ul>
            </div>
          </aside>
          <div class="main-panel">
            ${orderedSections}
            <div class="section-block">
              <h3>Additional information</h3>
              <p>${cvValue(state.training, 'Add certifications or training')}</p>
            </div>
            ${renderProjectSection()}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderInternationalPreview() {
  const education = (state.education || []).map((item) => `
    <div class="entry-item">
      <strong>${cvValue(item.qualification, 'Qualification')}</strong>
      <div>${cvValue(item.institution, 'Institution')}${item.subject ? ` · ${escapeHtml(item.subject)}` : ''}</div>
      <div class="entry-meta">${escapeHtml(item.date || '')} ${item.result ? `· ${escapeHtml(item.result)}` : ''}</div>
    </div>
  `).join('') || '<div class="entry-item"><span class="cv-hint">[Add education details]</span></div>';
  const experience = (state.experience || []).map((item) => `
    <div class="entry-item">
      <strong>${escapeHtml(item.role || 'Job title')}</strong>
      <div class="entry-meta">${cvValue(item.organization, 'Organization')} ${formatWorkPeriod(item) ? `· ${escapeHtml(formatWorkPeriod(item))}` : ''}</div>
      <div>${escapeHtml(item.details || '')}</div>
    </div>
  `).join('') || '<div class="entry-item"><span class="cv-hint">[Add relevant experience, if applicable]</span></div>';
  const skills = (state.skills || '').split(',').map((skill) => skill.trim()).filter(Boolean);
  const hasExperience = (state.experience || []).some((item) => item.role || item.organization || item.details);
  const firstMainSection = hasExperience
    ? `<div class="section-block"><h3>Experience</h3><div class="entry-list">${experience}</div></div>`
    : `<div class="section-block"><h3>Education</h3><div class="entry-list">${education}</div></div>`;
  const secondMainSection = hasExperience
    ? `<div class="section-block"><h3>Education</h3><div class="entry-list">${education}</div></div>`
    : `<div class="section-block"><h3>Experience</h3><div class="entry-list">${experience}</div></div>`;
  return `
    <div class="cv-sheet international-template">
      <div class="cv-page">
        <header class="core-header international-header">
          <div>
            <h2>${cvValue(state.fullName, 'Your full name')}</h2>
            <div>${cvValue(state.title, 'Professional title')}</div>
          </div>
          ${state.photoData ? `<img class="optional-cv-photo" src="${state.photoData}" alt="Optional profile photo" />` : ''}
          <div class="core-meta">
            <div>${escapeHtml(state.email || 'Email')}</div><div>${escapeHtml(state.phone || 'Phone')}</div>
            <div>${escapeHtml(state.linkedin || state.website || state.presentAddress || '')}</div>
          </div>
        </header>
        <div class="section-block"><h3>Professional Summary</h3><p>${cvValue(state.summary, 'Add a concise summary')}</p></div>
        ${firstMainSection}
        ${renderProjectSection()}
        ${secondMainSection}
        ${skills.length ? `<div class="section-block"><h3>Skills</h3><ul class="skill-list">${skills.map((skill) => `<li>${escapeHtml(skill)}</li>`).join('')}</ul></div>` : ''}
        ${state.training ? `<div class="section-block"><h3>Certifications &amp; Training</h3><p>${escapeHtml(state.training)}</p></div>` : ''}
      </div>
    </div>
  `;
}

function renderModernPreview() {
  const summary = cvValue(state.summary, 'Add a professional summary');
  const skillItems = (state.skills || '').split(',').map((item) => item.trim()).filter(Boolean);
  const skills = skillItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li><span class="cv-hint">[Add skills]</span></li>';
  const experience = state.experience?.map((item) => `
    <div class="entry-item">
      <strong>${cvValue(item.role, 'Role')}</strong>
      <div class="entry-meta"><span>${cvValue(item.organization, 'Company')}</span> <span>${escapeHtml(formatWorkPeriod(item))}</span></div>
      <div>${cvValue(item.details, 'Description')}</div>
    </div>
  `).join('') || '<div class="entry-item"><span class="cv-hint">[Add relevant experience]</span></div>';

  return `
    <div class="cv-sheet modern-template">
      <div class="cv-page">
        <header class="core-header">
          <div>
            <h2>${cvValue(state.fullName, 'Your full name')}</h2>
            <div>${cvValue(state.title, 'Professional title')}</div>
          </div>
          ${state.photoData ? `<img class="optional-cv-photo" src="${state.photoData}" alt="Optional profile photo" />` : ''}
          <div class="core-meta">
            <div>${escapeHtml(state.email || 'Email')}</div>
            <div>${escapeHtml(state.phone || 'Phone')}</div>
            <div>${escapeHtml(state.website || 'Website')}</div>
          </div>
        </header>
        <div class="two-column">
          <aside class="side-panel">
            <div class="section-block">
              <h3>Profile</h3>
              <p>${summary}</p>
            </div>
            <div class="section-block">
              <h3>Skills</h3>
              <ul class="skill-list">${skills}</ul>
            </div>
            <div class="section-block">
              <h3>Languages</h3>
              <ul class="lang-list">${(state.languages || []).map((item) => `<li>${cvValue(item.language, 'Language')}: ${cvValue(item.level, 'Proficiency level')}</li>`).join('') || '<li><span class="cv-hint">[Add languages]</span></li>'}</ul>
            </div>
          </aside>
          <div class="main-panel">
            <div class="section-block">
              <h3>Experience</h3>
              <div class="entry-list">${experience}</div>
            </div>
            <div class="section-block">
              <h3>Education</h3>
              <div class="entry-list">${(state.education || []).map((item) => `<div class="entry-item"><strong>${cvValue(item.qualification, 'Qualification')}</strong><div>${cvValue(item.institution, 'Institution')}</div><div class="entry-meta"><span>${cvValue(item.date, 'Dates')}</span><span>${cvValue(item.result, 'Result')}</span></div></div>`).join('') || '<div class="entry-item"><span class="cv-hint">[Add education]</span></div>'}</div>
            </div>
            <div class="section-block">
              <h3>Projects &amp; Training</h3>
              <p>${cvValue(state.training, 'Add projects or training')}</p>
            </div>
            ${renderProjectSection()}
          </div>
        </div>
      </div>
    </div>
  `;
}

function bindEvents() {
  document.querySelectorAll('.template-card').forEach((button) => {
    button.addEventListener('click', () => setTemplate(button.dataset.template));
  });

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (target.matches('[data-field]')) {
      updateStateFromInput(target);
    }
  });

  document.addEventListener('change', (event) => {
    const target = event.target;
    if (target.matches('[data-field]')) {
      updateStateFromInput(target);
    }
  });

  document.getElementById('photoInput')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Please upload a JPG, PNG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Please use an image smaller than 2MB.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      state.photoData = reader.result;
      persistState();
      syncFromState();
      event.target.value = '';
    };
    reader.onerror = () => {
      alert('The selected image could not be read. Please try another file.');
      event.target.value = '';
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('removePhotoBtn')?.addEventListener('click', () => {
    state.photoData = '';
    const input = document.getElementById('photoInput');
    if (input) input.value = '';
    persistState();
    syncFromState();
  });

  const signatureCanvas = document.getElementById('signaturePad');
  if (signatureCanvas) {
    const context = signatureCanvas.getContext('2d');
    let drawing = false;
    const pointFromEvent = (event) => {
      const rect = signatureCanvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) * (signatureCanvas.width / rect.width),
        y: (event.clientY - rect.top) * (signatureCanvas.height / rect.height)
      };
    };
    signatureCanvas.addEventListener('pointerdown', (event) => {
      drawing = true;
      signatureCanvas.setPointerCapture(event.pointerId);
      state.signature = '';
      const typedSignature = document.querySelector('[data-field="signature"]');
      if (typedSignature) typedSignature.value = '';
      const point = pointFromEvent(event);
      context.beginPath();
      context.moveTo(point.x, point.y);
    });
    signatureCanvas.addEventListener('pointermove', (event) => {
      if (!drawing) return;
      const point = pointFromEvent(event);
      context.lineTo(point.x, point.y);
      context.stroke();
    });
    const finishSignature = () => {
      if (!drawing) return;
      drawing = false;
      state.signatureData = signatureCanvas.toDataURL('image/png');
      persistState();
      renderPreview();
    };
    signatureCanvas.addEventListener('pointerup', finishSignature);
    signatureCanvas.addEventListener('pointercancel', finishSignature);
    document.getElementById('clearSignatureBtn')?.addEventListener('click', () => {
      context.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
      state.signatureData = '';
      persistState();
      renderPreview();
    });
  }

  document.getElementById('addEducationBtn')?.addEventListener('click', () => addEntry('education'));
  document.getElementById('addExperienceBtn')?.addEventListener('click', () => addEntry('experience'));
  document.getElementById('addProjectBtn')?.addEventListener('click', () => addEntry('projects'));
  document.getElementById('addLanguageBtn')?.addEventListener('click', () => addEntry('languages'));
  document.getElementById('addReferenceBtn')?.addEventListener('click', () => addEntry('references'));

  document.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-remove]');
    if (removeButton) {
      removeEntry(removeButton.dataset.remove, Number(removeButton.dataset.index));
    }

    const moveButton = event.target.closest('[data-move]');
    if (moveButton) {
      moveEntry(moveButton.dataset.move, Number(moveButton.dataset.index), Number(moveButton.dataset.direction));
    }

    const suggestion = event.target.closest('[data-suggestion]');
    if (suggestion) {
      applySuggestion(suggestion.dataset.suggestion);
    }
  });

  document.getElementById('useSummarySuggestionBtn')?.addEventListener('click', () => {
    const nextValue = document.getElementById('summarySuggestion')?.textContent || '';
    const current = String(state.summary || '').trim();
    if (current && !window.confirm('Replace the current summary with this editable starter?')) return;
    state.summary = nextValue;
    const summaryField = document.querySelector('[data-field="summary"]');
    if (summaryField) summaryField.value = nextValue;
    persistState();
    renderPreview();
  });

  document.getElementById('saveNowBtn')?.addEventListener('click', saveNow);
  document.getElementById('clearDataBtn')?.addEventListener('click', () => {
    if (!window.confirm('Clear all CV details saved in this browser? This cannot be undone.')) return;
    state = {
      ...cloneData(defaultState),
      fullName: '', phone: '', email: '', fatherName: '', motherName: '', dob: '', gender: '',
      bloodGroup: '', nationality: '', maritalStatus: '', religion: '', presentAddress: '',
      permanentAddress: '', summary: '', skills: '', training: '', hobbies: '', declaration: '',
      signature: '', authoritySignature: '', title: '', linkedin: '', website: '', targetRole: '',
      targetCountry: '', jobDescription: '', education: [], experience: [], projects: [],
      languages: [], references: [], photoData: '', signatureData: ''
    };
    saveNow();
    syncFromState();
  });

  document.getElementById('languageSelector')?.addEventListener('change', (event) => {
    applyLanguage(event.target.value);
  });

  document.getElementById('togglePreviewBtn')?.addEventListener('click', () => {
    const workspace = document.getElementById('workspace');
    if (!workspace) return;
    workspace.classList.toggle('preview-mode');
    document.getElementById('togglePreviewBtn').textContent =
      workspace.classList.contains('preview-mode') ? 'Edit CV' : 'Preview CV';
    renderPreview();
  });

  document.getElementById('exportPdfBtn')?.addEventListener('click', () => {
    if (state.template === 'bangladesh' && window.cvoraAnalysis?.pageCount !== 2) {
      alert('The Bangladesh template must contain exactly two pages. Please review the preview before printing.');
      return;
    }
    if (state.template === 'bangladesh' && window.cvoraAnalysis?.overflowing) {
      alert('The Bangladesh CV content does not fit legibly in two pages. Shorten or reorganize the highlighted content before exporting; no content will be removed automatically.');
      return;
    }
    if (state.template === 'bangladesh' && window.cvoraAnalysis?.recommendations.length) {
      if (!window.confirm('The CV Assistant found items to review. Print the CV anyway?')) return;
    }
    window.print();
  });
}

window.addEventListener('resize', () => {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(renderPreview, 120);
});

function initialize() {
  bindEvents();
  document.getElementById('currentTemplateLabel').textContent = templateNames[state.template] || 'CV Template';
  document.querySelectorAll('.template-card').forEach((card) => {
    card.classList.toggle('active', card.dataset.template === state.template);
  });
  applyLanguage(currentLanguage);
  syncFromState();
}

window.addEventListener('DOMContentLoaded', initialize);
