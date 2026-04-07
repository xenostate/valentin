/* ─── State ─────────────────────────────────────────────────────────────── */
let apiKey = '';
let currentText = '';
let markedIndices = new Set(); // indices of marked word spans
let lastDifficulty = 'intermediate';

/* ─── Elements ──────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const setupScreen       = $('setup');
const appScreen         = $('app');
const apiKeyInput       = $('apiKeyInput');
const saveKeyBtn        = $('saveKeyBtn');
const changeKeyBtn      = $('changeKeyBtn');
const generateBtn       = $('generateBtn');
const difficultySelect  = $('difficultySelect');
const emptyState        = $('emptyState');
const loadingState      = $('loadingState');
const readingView       = $('readingView');
const koreanText        = $('koreanText');
const markedCount       = $('markedCount');
const doneBtn           = $('doneBtn');
const explainingState   = $('explainingState');
const explanationsView  = $('explanationsView');
const originalTextDisplay = $('originalTextDisplay');
const explanationList   = $('explanationList');
const newTextBtn        = $('newTextBtn');
const errorState        = $('errorState');
const errorMessage      = $('errorMessage');
const retryBtn          = $('retryBtn');

/* ─── Init ──────────────────────────────────────────────────────────────── */
function init() {
  const saved = localStorage.getItem('korean_app_api_key');
  if (saved) {
    apiKey = saved;
    showApp();
  } else {
    showSetup();
  }
}

/* ─── Screen helpers ────────────────────────────────────────────────────── */
function showSetup() {
  setupScreen.classList.remove('hidden');
  appScreen.classList.add('hidden');
}

function showApp() {
  setupScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  showView('empty');
}

function showView(name) {
  emptyState.classList.add('hidden');
  loadingState.classList.add('hidden');
  readingView.classList.add('hidden');
  explainingState.classList.add('hidden');
  explanationsView.classList.add('hidden');
  errorState.classList.add('hidden');

  if (name === 'empty')      emptyState.classList.remove('hidden');
  if (name === 'loading')    loadingState.classList.remove('hidden');
  if (name === 'reading')    readingView.classList.remove('hidden');
  if (name === 'explaining') explainingState.classList.remove('hidden');
  if (name === 'explanations') explanationsView.classList.remove('hidden');
  if (name === 'error')      errorState.classList.remove('hidden');
}

/* ─── API Key ───────────────────────────────────────────────────────────── */
saveKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key.startsWith('sk-')) {
    apiKeyInput.style.borderColor = 'var(--danger)';
    return;
  }
  apiKeyInput.style.borderColor = '';
  apiKey = key;
  localStorage.setItem('korean_app_api_key', key);
  showApp();
});

changeKeyBtn.addEventListener('click', () => {
  apiKeyInput.value = '';
  showSetup();
});

apiKeyInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') saveKeyBtn.click();
});

/* ─── Generate Text ─────────────────────────────────────────────────────── */
generateBtn.addEventListener('click', generateText);
newTextBtn.addEventListener('click', generateText);
retryBtn.addEventListener('click', generateText);

async function generateText() {
  const difficulty = difficultySelect.value;
  lastDifficulty = difficulty;
  markedIndices.clear();
  showView('loading');
  generateBtn.disabled = true;

  const difficultyDescriptions = {
    beginner:     'A1–A2 level. Use very simple vocabulary, basic sentence structures (subject-verb-object), present tense, and common everyday topics like greetings, food, family. Avoid complex grammar.',
    intermediate: 'B1–B2 level. Use moderately complex sentences, varied vocabulary, some idiomatic expressions, and topics like travel, hobbies, work, culture.',
    advanced:     'C1–C2 level. Use sophisticated vocabulary, complex grammar patterns, nuanced expressions, abstract topics like society, philosophy, or literature.'
  };

  const topics = [
    '한국의 음식 문화', '서울의 하루', '계절의 변화', '한국 전통 명절',
    '카페 문화', '한강 공원', '친구와의 여행', '좋아하는 취미',
    '현대 한국 생활', '시장 구경', '날씨 이야기', '주말 계획'
  ];
  const topic = topics[Math.floor(Math.random() * topics.length)];

  const prompt = `Write a natural Korean text about "${topic}" for a ${difficulty} Korean learner.

Requirements:
- ${difficultyDescriptions[difficulty]}
- Length: exactly 200–300 words
- Write in natural, flowing Korean as a native speaker would
- Do NOT include any English, romanization, or translation
- Do NOT include a title
- Just the Korean text, paragraph(s) only`;

  try {
    const text = await callOpenAI([{ role: 'user', content: prompt }], 600);
    currentText = text.trim();
    renderKoreanText(currentText);
    showView('reading');
  } catch (err) {
    showError(err.message);
  } finally {
    generateBtn.disabled = false;
  }
}

/* ─── Render Korean Text as Clickable Words ─────────────────────────────── */
function renderKoreanText(text) {
  koreanText.innerHTML = '';
  markedIndices.clear();
  updateMarkedCount();

  // Split preserving whitespace and punctuation clusters attached to words
  // Strategy: split on whitespace boundaries, keep newlines as <br>
  const lines = text.split('\n');

  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) koreanText.appendChild(document.createElement('br'));

    // Tokenize: split by spaces, each token becomes a span
    const tokens = line.split(/(\s+)/);
    let wordIndex = 0;

    tokens.forEach(token => {
      if (/^\s+$/.test(token)) {
        // Pure whitespace — render as text node
        koreanText.appendChild(document.createTextNode(token));
      } else if (token.length > 0) {
        const span = document.createElement('span');
        span.className = 'word';
        span.textContent = token;

        const idx = wordIndex++;
        span.dataset.idx = idx;

        span.addEventListener('click', () => toggleMark(span, idx));
        koreanText.appendChild(span);
      }
    });
  });
}

function toggleMark(span, idx) {
  if (markedIndices.has(idx)) {
    markedIndices.delete(idx);
    span.classList.remove('marked');
  } else {
    markedIndices.add(idx);
    span.classList.add('marked');
  }
  updateMarkedCount();
}

function updateMarkedCount() {
  const n = markedIndices.size;
  markedCount.textContent = n === 0
    ? '0 words marked'
    : `${n} word${n === 1 ? '' : 's'} marked`;
}

/* ─── Done: Explain Marked Words ────────────────────────────────────────── */
doneBtn.addEventListener('click', async () => {
  // Collect marked word texts (deduplicated, strip punctuation for lookup)
  const spans = koreanText.querySelectorAll('.word.marked');
  if (spans.length === 0) {
    alert('Click on some words you don\'t understand first!');
    return;
  }

  // Unique clean words for explanation, preserving display form
  const markedWords = [...new Set([...spans].map(s => s.textContent.trim()))];

  showView('explaining');
  doneBtn.disabled = true;

  const prompt = `I am reading this Korean text:

"${currentText}"

I didn't understand these words/phrases: ${markedWords.join(', ')}

For each word or phrase, provide a JSON object in this exact format:
{
  "explanations": [
    {
      "word": "<the Korean word as it appeared>",
      "romanization": "<romanization using Revised Romanization>",
      "meaning": "<clear English meaning, including part of speech>",
      "grammar_note": "<brief grammar note if relevant, e.g. verb ending, particle usage — or empty string if not applicable>",
      "example_korean": "<a short example sentence in Korean using this word>",
      "example_english": "<English translation of the example sentence>"
    }
  ]
}

Return ONLY valid JSON. No extra text.`;

  try {
    const raw = await callOpenAI([{ role: 'user', content: prompt }], 1200);
    let data;
    try {
      // Extract JSON even if model adds markdown fences
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      data = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      throw new Error('Failed to parse explanations. Please try again.');
    }

    renderExplanations(data.explanations, markedWords);
    showView('explanations');
  } catch (err) {
    showError(err.message);
  } finally {
    doneBtn.disabled = false;
  }
});

/* ─── Render Explanations ───────────────────────────────────────────────── */
function renderExplanations(explanations, markedWords) {
  // Show original text with marked words highlighted
  renderOriginalWithHighlights(markedWords);

  explanationList.innerHTML = '';

  if (!explanations || explanations.length === 0) {
    explanationList.innerHTML = '<p style="color:var(--muted)">No explanations returned.</p>';
    return;
  }

  explanations.forEach(exp => {
    const card = document.createElement('div');
    card.className = 'explanation-card';

    card.innerHTML = `
      <div class="exp-word">${escapeHtml(exp.word)}</div>
      ${exp.romanization ? `<div class="exp-romanization">${escapeHtml(exp.romanization)}</div>` : ''}
      <div class="exp-meaning">${escapeHtml(exp.meaning)}</div>
      ${exp.grammar_note ? `<div class="exp-grammar">📝 ${escapeHtml(exp.grammar_note)}</div>` : ''}
      ${exp.example_korean ? `
        <div class="exp-example">
          <div class="exp-example-label">Example</div>
          <div class="exp-example-korean">${escapeHtml(exp.example_korean)}</div>
          ${exp.example_english ? `<div class="exp-example-english">${escapeHtml(exp.example_english)}</div>` : ''}
        </div>
      ` : ''}
    `;

    explanationList.appendChild(card);
  });
}

function renderOriginalWithHighlights(markedWords) {
  // Build a regex that matches any of the marked words (escape special chars)
  const escaped = markedWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${escaped.join('|')})`, 'g');

  const highlighted = currentText
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(pattern, '<span class="marked-word">$1</span>');

  originalTextDisplay.innerHTML = highlighted;
}

/* ─── OpenAI API Call ───────────────────────────────────────────────────── */
async function callOpenAI(messages, maxTokens = 800) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: maxTokens,
      temperature: 0.8
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message || `API error ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/* ─── Error ─────────────────────────────────────────────────────────────── */
function showError(msg) {
  errorMessage.textContent = msg;
  showView('error');
}

/* ─── Utilities ─────────────────────────────────────────────────────────── */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─── Start ─────────────────────────────────────────────────────────────── */
init();
