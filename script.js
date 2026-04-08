/* ─── State ─────────────────────────────────────────────────────────────── */
let apiKey       = '';
let currentText  = '';

// word lookup: Map<cleanWord, null | { romanization, meaning, pos } | { error: true }>
// null means fetch is in progress
const wordCache = new Map();

// ordered list of unique clean words the user has clicked
const clickedWords = [];

// which clean word's popup is currently showing (null = none)
let activePopup = null;

/* ─── Quiz state ────────────────────────────────────────────────────────── */
// [{id, korean, english, romanization}]
let quizItems       = [];
let selectedKorean  = null;  // id of selected Korean card, or null
let matchedCount    = 0;
let mistakes        = 0;

/* ─── Elements ──────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const setupScreen      = $('setup');
const appScreen        = $('app');
const apiKeyInput      = $('apiKeyInput');
const saveKeyBtn       = $('saveKeyBtn');
const changeKeyBtn     = $('changeKeyBtn');
const generateBtn      = $('generateBtn');
const difficultySelect = $('difficultySelect');
const emptyState       = $('emptyState');
const loadingState     = $('loadingState');
const readingView      = $('readingView');
const koreanTextEl     = $('koreanText');
const lookedUpCount    = $('lookedUpCount');
const quizBtn          = $('quizBtn');
const quizView         = $('quizView');
const koreanColumn     = $('koreanColumn');
const englishColumn    = $('englishColumn');
const quizMatchedEl    = $('quizMatched');
const quizTotalEl      = $('quizTotal');
const quizMistakesEl   = $('quizMistakes');
const mistakesCountEl  = $('mistakesCount');
const mistakesPluralEl = $('mistakesPlural');
const quizComplete     = $('quizComplete');
const completionText   = $('completionText');
const quizNewTextBtn   = $('quizNewTextBtn');
const errorState       = $('errorState');
const errorMessage     = $('errorMessage');
const retryBtn         = $('retryBtn');

/* ─── Init ──────────────────────────────────────────────────────────────── */
function init() {
  const saved = localStorage.getItem('korean_app_api_key');
  if (saved) { apiKey = saved; showApp(); }
  else showSetup();
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
  [emptyState, loadingState, readingView, quizView, errorState]
    .forEach(el => el.classList.add('hidden'));
  closePopup();
  if (name === 'empty')   emptyState.classList.remove('hidden');
  if (name === 'loading') loadingState.classList.remove('hidden');
  if (name === 'reading') readingView.classList.remove('hidden');
  if (name === 'quiz')    quizView.classList.remove('hidden');
  if (name === 'error')   errorState.classList.remove('hidden');
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

changeKeyBtn.addEventListener('click', () => { apiKeyInput.value = ''; showSetup(); });
apiKeyInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveKeyBtn.click(); });

/* ─── Generate Text ─────────────────────────────────────────────────────── */
generateBtn.addEventListener('click', generateText);
quizNewTextBtn.addEventListener('click', generateText);
retryBtn.addEventListener('click', generateText);

async function generateText() {
  wordCache.clear();
  clickedWords.length = 0;
  showView('loading');
  generateBtn.disabled = true;

  const difficulty = difficultySelect.value;
  const descriptions = {
    beginner:     'A1–A2 level. Very simple vocabulary, basic sentence structures, present tense, everyday topics (greetings, food, family). No complex grammar.',
    intermediate: 'B1–B2 level. Varied vocabulary, moderately complex sentences, some idiomatic expressions, topics like travel, hobbies, work, culture.',
    advanced:     'C1–C2 level. Sophisticated vocabulary, complex grammar, nuanced expressions, abstract topics like society, philosophy, or literature.',
  };

  const topics = [
    '한국의 음식 문화', '서울의 하루', '계절의 변화', '한국 전통 명절',
    '카페 문화', '한강 공원', '친구와의 여행', '좋아하는 취미',
    '현대 한국 생활', '시장 구경', '날씨 이야기', '주말 계획',
  ];
  const topic = topics[Math.floor(Math.random() * topics.length)];

  const prompt =
    `Write a natural Korean text about "${topic}" for a ${difficulty} learner.\n` +
    `${descriptions[difficulty]}\n` +
    `Length: 200–300 words. No English, no romanization, no title. Korean text only.`;

  try {
    const text = await callOpenAI([{ role: 'user', content: prompt }], 600);
    currentText = text.trim();
    renderText(currentText);
    updateLookedUpCount();
    showView('reading');
  } catch (err) {
    showError(err.message);
  } finally {
    generateBtn.disabled = false;
  }
}

/* ─── Render Text ───────────────────────────────────────────────────────── */
function renderText(text) {
  koreanTextEl.innerHTML = '';

  text.split('\n').forEach((line, i) => {
    if (i > 0) koreanTextEl.appendChild(document.createElement('br'));

    line.split(/(\s+)/).forEach(token => {
      if (/^\s+$/.test(token)) {
        koreanTextEl.appendChild(document.createTextNode(token));
      } else if (token) {
        const span = document.createElement('span');
        span.className = 'word';
        span.textContent = token;
        span.addEventListener('click', e => {
          e.stopPropagation();
          onWordClick(span, token);
        });
        koreanTextEl.appendChild(span);
      }
    });
  });
}

/* ─── Word Click → Popup ────────────────────────────────────────────────── */
function onWordClick(span, displayWord) {
  const clean = cleanWord(displayWord);
  if (!clean) return;

  // Toggle off if same word's popup is already open
  if (activePopup === clean) {
    closePopup();
    return;
  }

  closePopup();
  activePopup = clean;
  span.classList.add('looked-up', 'popup-open');

  // Track this word (first time only)
  if (!wordCache.has(clean)) {
    clickedWords.push(clean);
    wordCache.set(clean, null); // null = loading
    fetchTranslation(clean, displayWord); // fire and forget
  }

  openPopup(span, clean, displayWord);
  updateLookedUpCount();
}

function openPopup(span, clean, displayWord) {
  const rect = span.getBoundingClientRect();
  const cached = wordCache.get(clean);

  const popup = document.createElement('div');
  popup.id = 'wordPopup';
  popup.className = 'word-popup';

  // Position below the word, clamped to viewport width
  const popupWidth = 280;
  const left = Math.min(
    Math.max(8, rect.left + window.scrollX - 4),
    window.innerWidth - popupWidth - 8
  );
  popup.style.top  = (rect.bottom + window.scrollY + 10) + 'px';
  popup.style.left = left + 'px';

  // Arrow horizontal offset (point toward the word)
  const arrowLeft = Math.max(10, (rect.left + window.scrollX + rect.width / 2) - left - 6);
  popup.style.setProperty('--arrow-left', arrowLeft + 'px');

  popup.innerHTML = cached
    ? (cached.error ? popupErrorHtml(displayWord) : popupContentHtml(displayWord, cached))
    : popupLoadingHtml(displayWord);

  document.body.appendChild(popup);

  // Fix the ::before arrow position using inline style trick
  const arrowEl = document.createElement('style');
  arrowEl.id = 'popupArrowStyle';
  arrowEl.textContent = `#wordPopup::before { left: ${arrowLeft}px; }`;
  document.head.appendChild(arrowEl);

  // Close when clicking outside
  setTimeout(() => {
    document.addEventListener('click', onDocClick);
    window.addEventListener('scroll', closePopup, { once: true, passive: true });
  }, 0);
}

function onDocClick(e) {
  const popup = document.getElementById('wordPopup');
  if (popup && !popup.contains(e.target)) closePopup();
}

function closePopup() {
  const popup = document.getElementById('wordPopup');
  if (popup) popup.remove();
  document.getElementById('popupArrowStyle')?.remove();
  document.removeEventListener('click', onDocClick);

  // Remove popup-open highlight from whatever word was open
  if (activePopup) {
    koreanTextEl.querySelectorAll('.popup-open').forEach(s => s.classList.remove('popup-open'));
  }
  activePopup = null;
}

function updatePopupIfOpen(clean, displayWord) {
  if (activePopup !== clean) return;
  const popup = document.getElementById('wordPopup');
  if (!popup) return;
  const cached = wordCache.get(clean);
  if (!cached) return;
  popup.innerHTML = cached.error
    ? popupErrorHtml(displayWord)
    : popupContentHtml(displayWord, cached);
}

/* ─── Popup HTML ────────────────────────────────────────────────────────── */
function popupLoadingHtml(word) {
  return `<div class="popup-loading">
    <div class="popup-spinner"></div>
    <span>Looking up <strong>${escapeHtml(word)}</strong>…</span>
  </div>`;
}

function popupErrorHtml(word) {
  return `<div class="popup-error">
    Could not translate <strong>${escapeHtml(word)}</strong>. Try again later.
  </div>`;
}

function popupContentHtml(word, t) {
  return `<div class="popup-body">
    <div class="popup-word">${escapeHtml(word)}</div>
    ${t.romanization ? `<div class="popup-romanization">${escapeHtml(t.romanization)}</div>` : ''}
    ${t.pos ? `<span class="popup-pos">${escapeHtml(t.pos)}</span>` : ''}
    <div class="popup-meaning">${escapeHtml(t.meaning)}</div>
  </div>`;
}

/* ─── Fetch Word Translation ────────────────────────────────────────────── */
async function fetchTranslation(clean, displayWord) {
  const prompt =
    `Korean text context: "${currentText}"\n\n` +
    `Translate this Korean word as used in the text: "${clean}"\n\n` +
    `Return ONLY this JSON (no markdown):\n` +
    `{"romanization":"...","pos":"noun/verb/adjective/adverb/particle/etc","meaning":"..."}` +
    `\nKeep "meaning" to 1–6 words.`;

  try {
    const raw = await callOpenAI([{ role: 'user', content: prompt }], 80, 0.3);
    const match = raw.match(/\{[\s\S]*\}/);
    const data = JSON.parse(match ? match[0] : raw);
    wordCache.set(clean, {
      romanization: data.romanization || '',
      pos:          data.pos          || '',
      meaning:      data.meaning      || clean,
    });
  } catch {
    wordCache.set(clean, { error: true });
  }
  updatePopupIfOpen(clean, displayWord);
}

/* ─── Looked-up Counter ─────────────────────────────────────────────────── */
function updateLookedUpCount() {
  const n = clickedWords.length;
  lookedUpCount.textContent = n === 0
    ? '0 words looked up'
    : `${n} word${n === 1 ? '' : 's'} looked up`;
}

/* ─── Start Quiz ────────────────────────────────────────────────────────── */
quizBtn.addEventListener('click', () => {
  // Only include words that have a successful translation
  const ready = clickedWords.filter(w => {
    const c = wordCache.get(w);
    return c && !c.error;
  });

  if (ready.length < 2) {
    alert('Look up at least 2 words before starting the quiz!');
    return;
  }

  buildQuiz(ready);
  showView('quiz');
});

function buildQuiz(words) {
  quizItems = words.map((w, i) => {
    const t = wordCache.get(w);
    return { id: i, korean: w, english: t.meaning, romanization: t.romanization };
  });
  selectedKorean = null;
  matchedCount   = 0;
  mistakes       = 0;

  const koreanOrder  = shuffle([...quizItems]);
  const englishOrder = shuffle([...quizItems]);

  // Korean column (keep first label child)
  koreanColumn.innerHTML  = '<div class="column-label">Korean</div>';
  englishColumn.innerHTML = '<div class="column-label">Meaning</div>';
  quizComplete.classList.add('hidden');

  quizMatchedEl.textContent = '0';
  quizTotalEl.textContent   = quizItems.length;
  quizMistakesEl.classList.add('hidden');

  koreanOrder.forEach(item => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.textContent = item.korean;
    card.dataset.id = item.id;
    card.dataset.side = 'korean';
    card.addEventListener('click', () => onQuizClick(card, 'korean', item.id));
    koreanColumn.appendChild(card);
  });

  englishOrder.forEach(item => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.textContent = item.english;
    card.dataset.id = item.id;
    card.dataset.side = 'english';
    card.addEventListener('click', () => onQuizClick(card, 'english', item.id));
    englishColumn.appendChild(card);
  });
}

/* ─── Quiz Interaction ──────────────────────────────────────────────────── */
function onQuizClick(card, side, id) {
  if (card.classList.contains('matched') || card.classList.contains('wrong')) return;

  if (side === 'korean') {
    // Select / deselect Korean card
    clearKoreanSelection();
    if (selectedKorean === id) {
      selectedKorean = null;
    } else {
      selectedKorean = id;
      card.classList.add('selected');
    }
    return;
  }

  // Clicked English side
  if (selectedKorean === null) return; // nothing selected on Korean side

  if (selectedKorean === id) {
    // Correct match!
    markMatched(id);
  } else {
    // Wrong — flash both
    mistakes++;
    flashWrong(selectedKorean, id);
    clearKoreanSelection();
    selectedKorean = null;
    updateMistakes();
  }
}

function markMatched(id) {
  quizView.querySelectorAll(`.quiz-card[data-id="${id}"]`).forEach(c => {
    c.classList.remove('selected', 'wrong');
    c.classList.add('matched');
  });
  selectedKorean = null;
  matchedCount++;
  quizMatchedEl.textContent = matchedCount;

  if (matchedCount === quizItems.length) {
    setTimeout(showQuizComplete, 300);
  }
}

function flashWrong(koreanId, englishId) {
  const korCard = quizView.querySelector(`.quiz-card[data-side="korean"][data-id="${koreanId}"]`);
  const engCard = quizView.querySelector(`.quiz-card[data-side="english"][data-id="${englishId}"]`);
  [korCard, engCard].forEach(c => {
    if (!c) return;
    c.classList.add('wrong');
    setTimeout(() => c.classList.remove('wrong'), 400);
  });
}

function clearKoreanSelection() {
  koreanColumn.querySelectorAll('.selected').forEach(c => c.classList.remove('selected'));
}

function updateMistakes() {
  if (mistakes === 0) return;
  quizMistakesEl.classList.remove('hidden');
  mistakesCountEl.textContent = mistakes;
  mistakesPluralEl.textContent = mistakes === 1 ? '' : 's';
}

function showQuizComplete() {
  if (mistakes === 0) {
    completionText.innerHTML = '<strong>Perfect score!</strong> No mistakes.';
  } else {
    completionText.innerHTML =
      `All matched with <strong>${mistakes} mistake${mistakes === 1 ? '' : 's'}</strong>. Keep practising!`;
  }
  quizComplete.classList.remove('hidden');
}

/* ─── Utilities ─────────────────────────────────────────────────────────── */
function cleanWord(token) {
  // Strip leading/trailing punctuation, keep Korean characters
  return token.replace(/^[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]+|[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]+$/g, '') || token;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─── OpenAI ────────────────────────────────────────────────────────────── */
async function callOpenAI(messages, maxTokens = 800, temperature = 0.8) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: maxTokens, temperature }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `API error ${res.status}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

/* ─── Error ─────────────────────────────────────────────────────────────── */
function showError(msg) {
  errorMessage.textContent = msg;
  showView('error');
}

/* ─── Start ─────────────────────────────────────────────────────────────── */
init();
