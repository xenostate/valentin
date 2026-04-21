const STORAGE_KEYS = {
  apiKey: 'leetkor_api_key',
  progress: 'leetkor_progress_v1',
};

const TRACKS = {
  topik1: {
    label: 'TOPIK I',
    description: 'Beginner exam with practical everyday vocabulary and short passages.',
    readingLength: '90-140 Korean characters',
    writingTypes: ['summary'],
    listeningTone: 'simple daily-life situations',
    mockMinutes: 12,
  },
  'topik2-mid': {
    label: 'TOPIK II (Level 3-4)',
    description: 'Intermediate exam with notices, arguments, and practical formal Korean.',
    readingLength: '180-260 Korean characters',
    writingTypes: ['summary', 'chart', 'argument'],
    listeningTone: 'practical formal situations and medium-length conversations',
    mockMinutes: 18,
  },
  'topik2-adv': {
    label: 'TOPIK II (Level 5-6)',
    description: 'Advanced exam with abstract topics, nuanced reading, and essay writing.',
    readingLength: '260-360 Korean characters',
    writingTypes: ['chart', 'argument'],
    listeningTone: 'advanced topics and nuanced spoken content',
    mockMinutes: 20,
  },
};

const DEFAULT_PROGRESS = {
  sessions: [],
  questionHistory: [],
  readingSetsCompleted: 0,
  listeningSetsCompleted: 0,
  writingEvaluations: [],
  savedWords: {},
  mistakeNotebook: [],
  mockHistory: [],
  lastTrack: 'topik2-mid',
};

let apiKey = '';
let progress = loadProgress();
let currentView = 'dashboard';

let currentReadingSet = null;
let currentListeningSet = null;
let currentWritingTask = null;
let currentMockExam = null;
let mockTimerInterval = null;
let mockTimeRemaining = 0;

const wordCache = new Map();
const clickedWords = [];
let activePopup = null;

let quizItems = [];
let selectedKorean = null;
let matchedCount = 0;
let mistakes = 0;

let savedQuizItems = [];
let savedSelectedKorean = null;
let savedMatchedCount = 0;

const $ = id => document.getElementById(id);

const els = {
  setupScreen: $('setup'),
  appScreen: $('app'),
  apiKeyInput: $('apiKeyInput'),
  saveKeyBtn: $('saveKeyBtn'),
  changeKeyBtn: $('changeKeyBtn'),
  trackSelect: $('trackSelect'),
  navButtons: Array.from(document.querySelectorAll('.nav-btn')),

  dashboardSummary: $('dashboardSummary'),
  dashboardReadingBtn: $('dashboardReadingBtn'),
  dashboardMockBtn: $('dashboardMockBtn'),
  sessionsStat: $('sessionsStat'),
  readingAccuracyStat: $('readingAccuracyStat'),
  savedWordsStat: $('savedWordsStat'),
  writingStat: $('writingStat'),
  nextStepCard: $('nextStepCard'),
  weakAreasList: $('weakAreasList'),
  recentActivityList: $('recentActivityList'),

  readingTypeSelect: $('readingTypeSelect'),
  generateReadingBtn: $('generateReadingBtn'),
  readingEmpty: $('readingEmpty'),
  readingLoading: $('readingLoading'),
  readingContent: $('readingContent'),
  readingTrackBadge: $('readingTrackBadge'),
  readingTypeBadge: $('readingTypeBadge'),
  readingTitle: $('readingTitle'),
  readingText: $('readingText'),
  readingObjectives: $('readingObjectives'),
  lookedUpCount: $('lookedUpCount'),
  readingQuizBtn: $('readingQuizBtn'),
  readingQuestionsBtn: $('readingQuestionsBtn'),
  readingQuestionsCard: $('readingQuestionsCard'),
  readingQuestionsList: $('readingQuestionsList'),
  readingQuestionStats: $('readingQuestionStats'),
  submitReadingQuestionsBtn: $('submitReadingQuestionsBtn'),
  readingResults: $('readingResults'),
  vocabQuizCard: $('vocabQuizCard'),

  koreanColumn: $('koreanColumn'),
  englishColumn: $('englishColumn'),
  quizMatched: $('quizMatched'),
  quizTotal: $('quizTotal'),
  quizMistakes: $('quizMistakes'),
  mistakesCount: $('mistakesCount'),
  mistakesPlural: $('mistakesPlural'),
  quizComplete: $('quizComplete'),
  completionText: $('completionText'),

  listeningTypeSelect: $('listeningTypeSelect'),
  generateListeningBtn: $('generateListeningBtn'),
  listeningEmpty: $('listeningEmpty'),
  listeningLoading: $('listeningLoading'),
  listeningContent: $('listeningContent'),
  listeningTrackBadge: $('listeningTrackBadge'),
  listeningTypeBadge: $('listeningTypeBadge'),
  listeningPromptTitle: $('listeningPromptTitle'),
  playListeningBtn: $('playListeningBtn'),
  replayListeningBtn: $('replayListeningBtn'),
  revealTranscriptBtn: $('revealTranscriptBtn'),
  listeningQuestion: $('listeningQuestion'),
  submitListeningBtn: $('submitListeningBtn'),
  listeningFeedback: $('listeningFeedback'),
  listeningTranscriptBox: $('listeningTranscriptBox'),

  writingTypeSelect: $('writingTypeSelect'),
  generateWritingBtn: $('generateWritingBtn'),
  writingEmpty: $('writingEmpty'),
  writingLoading: $('writingLoading'),
  writingContent: $('writingContent'),
  writingTrackBadge: $('writingTrackBadge'),
  writingTypeBadge: $('writingTypeBadge'),
  writingTitle: $('writingTitle'),
  writingPrompt: $('writingPrompt'),
  writingGuidance: $('writingGuidance'),
  writingAnswer: $('writingAnswer'),
  writingCharCount: $('writingCharCount'),
  evaluateWritingBtn: $('evaluateWritingBtn'),
  writingFeedbackCard: $('writingFeedbackCard'),
  writingFeedback: $('writingFeedback'),

  generateMockBtn: $('generateMockBtn'),
  mockEmpty: $('mockEmpty'),
  mockLoading: $('mockLoading'),
  mockContent: $('mockContent'),
  mockTrackBadge: $('mockTrackBadge'),
  mockTitle: $('mockTitle'),
  mockTimer: $('mockTimer'),
  mockSections: $('mockSections'),
  submitMockBtn: $('submitMockBtn'),
  mockResults: $('mockResults'),

  startReviewQuizBtn: $('startReviewQuizBtn'),
  savedWordsList: $('savedWordsList'),
  mistakeNotebookList: $('mistakeNotebookList'),
  writingLessonsList: $('writingLessonsList'),
  savedQuizCard: $('savedQuizCard'),
  savedKoreanColumn: $('savedKoreanColumn'),
  savedEnglishColumn: $('savedEnglishColumn'),
  savedQuizComplete: $('savedQuizComplete'),
  savedQuizCompletionText: $('savedQuizCompletionText'),
};

const views = {
  dashboard: $('dashboardView'),
  reading: $('readingView'),
  listening: $('listeningView'),
  writing: $('writingView'),
  mock: $('mockView'),
  review: $('reviewView'),
};

init();

function init() {
  const savedKey = localStorage.getItem(STORAGE_KEYS.apiKey);
  apiKey = savedKey || '';

  els.trackSelect.value = progress.lastTrack || 'topik2-mid';
  syncWritingOptions();

  wireEvents();

  if (apiKey) showApp();
  else showSetup();
}

function wireEvents() {
  els.saveKeyBtn.addEventListener('click', saveApiKey);
  els.changeKeyBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEYS.apiKey);
    apiKey = '';
    els.apiKeyInput.value = '';
    showSetup();
  });
  els.apiKeyInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') saveApiKey();
  });

  els.trackSelect.addEventListener('change', () => {
    progress.lastTrack = els.trackSelect.value;
    persistProgress();
    syncWritingOptions();
    renderDashboard();
  });

  els.navButtons.forEach(button => {
    button.addEventListener('click', () => switchView(button.dataset.view));
  });

  els.dashboardReadingBtn.addEventListener('click', () => {
    switchView('reading');
    generateReadingSet();
  });
  els.dashboardMockBtn.addEventListener('click', () => {
    switchView('mock');
    generateMockExam();
  });

  els.generateReadingBtn.addEventListener('click', generateReadingSet);
  els.readingQuestionsBtn.addEventListener('click', openReadingQuestions);
  els.submitReadingQuestionsBtn.addEventListener('click', submitReadingQuestions);
  els.readingQuizBtn.addEventListener('click', startClickedWordQuiz);

  els.generateListeningBtn.addEventListener('click', generateListeningSet);
  els.playListeningBtn.addEventListener('click', () => playListening(false));
  els.replayListeningBtn.addEventListener('click', () => playListening(true));
  els.revealTranscriptBtn.addEventListener('click', revealTranscript);
  els.submitListeningBtn.addEventListener('click', submitListeningAnswer);

  els.generateWritingBtn.addEventListener('click', generateWritingTask);
  els.writingAnswer.addEventListener('input', updateWritingCharCount);
  els.evaluateWritingBtn.addEventListener('click', evaluateWriting);

  els.generateMockBtn.addEventListener('click', generateMockExam);
  els.submitMockBtn.addEventListener('click', submitMockExam);

  els.startReviewQuizBtn.addEventListener('click', startSavedWordQuiz);
}

function showSetup() {
  els.setupScreen.classList.remove('hidden');
  els.appScreen.classList.add('hidden');
}

function showApp() {
  els.setupScreen.classList.add('hidden');
  els.appScreen.classList.remove('hidden');
  switchView(currentView);
  renderDashboard();
  renderReviewNotebook();
}

function switchView(viewName) {
  currentView = viewName;
  Object.entries(views).forEach(([name, el]) => {
    el.classList.toggle('hidden', name !== viewName);
  });
  els.navButtons.forEach(button => {
    button.classList.toggle('is-active', button.dataset.view === viewName);
  });

  if (viewName === 'dashboard') renderDashboard();
  if (viewName === 'review') renderReviewNotebook();
}

function saveApiKey() {
  const key = els.apiKeyInput.value.trim();
  if (!key.startsWith('sk-')) {
    els.apiKeyInput.style.borderColor = 'var(--danger)';
    return;
  }

  els.apiKeyInput.style.borderColor = '';
  apiKey = key;
  localStorage.setItem(STORAGE_KEYS.apiKey, key);
  showApp();
}

function syncWritingOptions() {
  const allowedTypes = TRACKS[els.trackSelect.value].writingTypes;
  Array.from(els.writingTypeSelect.options).forEach(option => {
    option.disabled = !allowedTypes.includes(option.value);
    option.hidden = !allowedTypes.includes(option.value);
  });

  if (!allowedTypes.includes(els.writingTypeSelect.value)) {
    els.writingTypeSelect.value = allowedTypes[0];
  }
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.progress);
    if (!raw) return cloneDefaultProgress();
    const parsed = JSON.parse(raw);
    return {
      ...cloneDefaultProgress(),
      ...parsed,
      savedWords: parsed.savedWords || {},
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      questionHistory: Array.isArray(parsed.questionHistory) ? parsed.questionHistory : [],
      writingEvaluations: Array.isArray(parsed.writingEvaluations) ? parsed.writingEvaluations : [],
      mistakeNotebook: Array.isArray(parsed.mistakeNotebook) ? parsed.mistakeNotebook : [],
      mockHistory: Array.isArray(parsed.mockHistory) ? parsed.mockHistory : [],
    };
  } catch {
    return cloneDefaultProgress();
  }
}

function persistProgress() {
  localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(progress));
}

function renderDashboard() {
  const savedWordCount = Object.keys(progress.savedWords).length;
  const totalQuestions = progress.questionHistory.length;
  const correctQuestions = progress.questionHistory.filter(item => item.correct).length;
  const accuracy = totalQuestions ? Math.round((correctQuestions / totalQuestions) * 100) : 0;

  els.sessionsStat.textContent = String(progress.sessions.length);
  els.readingAccuracyStat.textContent = `${accuracy}%`;
  els.savedWordsStat.textContent = String(savedWordCount);
  els.writingStat.textContent = String(progress.writingEvaluations.length);
  els.dashboardSummary.textContent = getDashboardSummary(savedWordCount, accuracy);

  els.nextStepCard.innerHTML = renderRecommendationCard();
  renderSimpleList(
    els.weakAreasList,
    getWeakAreas().map(item => ({
      title: item.title,
      body: item.body,
    })),
    'No weak areas yet. Start a drill and the app will begin tracking patterns.'
  );
  renderSimpleList(
    els.recentActivityList,
    progress.sessions.slice(-5).reverse().map(session => ({
      title: session.title,
      body: formatRelativeDate(session.createdAt),
    })),
    'Your recent study actions will appear here.'
  );
}

function getDashboardSummary(savedWordCount, accuracy) {
  const track = TRACKS[els.trackSelect.value];
  if (!progress.sessions.length) return `You are set to ${track.label}. Start with a reading or mini mock session and let the notebook build itself.`;
  if (accuracy < 60) return `You are working in ${track.label}. Accuracy is still shaky, so focus on reading questions and mistake review before doing more mock sets.`;
  if (savedWordCount < 10) return `You are making progress in ${track.label}. Build a bigger word bank so the review quiz has enough material to bite back.`;
  return `Momentum looks good for ${track.label}. Alternate mini mocks with writing feedback to cover both speed and output.`;
}

function renderRecommendationCard() {
  const weakAreas = getWeakAreas();
  const top = weakAreas[0];

  if (!top) {
    return `<div class="recommendation-item"><strong>Start with Reading Lab</strong><p>Generate a passage, answer the comprehension questions, and let the app collect your first mistake data.</p></div>`;
  }

  return `<div class="recommendation-item">
    <strong>${escapeHtml(top.title)}</strong>
    <p>${escapeHtml(top.body)}</p>
  </div>`;
}

function getWeakAreas() {
  const groups = [
    {
      key: 'reading-question',
      title: 'Reading comprehension needs more reps',
      body: 'Your recent reading accuracy is lagging. Generate a reading set and review why the distractors were tempting.',
    },
    {
      key: 'listening',
      title: 'Listening answers are unstable',
      body: 'Replay fewer times and answer before revealing the transcript to simulate test pressure.',
    },
    {
      key: 'writing',
      title: 'Writing is under-trained',
      body: 'You have fewer writing submissions than other activity. Add one structured answer to keep TOPIK output skills moving.',
    },
    {
      key: 'mock',
      title: 'Mini mock accuracy can improve',
      body: 'Do a timed mixed set next and focus on pacing, not just correctness.',
    },
  ];

  return groups.filter(group => {
    if (group.key === 'writing') return progress.writingEvaluations.length < 2 && progress.sessions.length > 2;
    const entries = progress.questionHistory.filter(item => item.category === group.key);
    if (!entries.length) return false;
    const correct = entries.filter(item => item.correct).length;
    return correct / entries.length < 0.65;
  });
}

async function generateReadingSet() {
  setLoadingState('reading', true);
  resetReadingUi();

  const track = TRACKS[els.trackSelect.value];
  const type = els.readingTypeSelect.value;
  const prompt = `
You are creating a compact TOPIK-style reading drill.
Return valid JSON only.

Track: ${track.label}
Passage type: ${type}
Length target: ${track.readingLength}

JSON shape:
{
  "title": "...",
  "typeLabel": "...",
  "topic": "...",
  "objectives": ["...", "...", "..."],
  "passage": "Korean text only",
  "questions": [
    {
      "prompt": "Question in English or simple Korean",
      "options": ["A", "B", "C", "D"],
      "answerIndex": 0,
      "skill": "main idea/detail/inference/vocabulary",
      "explanation": "short explanation"
    }
  ]
}

Rules:
- Passage must be natural Korean.
- Create exactly 5 multiple-choice questions.
- Match difficulty to ${track.label}.
- Avoid markdown fences.
`;

  try {
    currentReadingSet = await callJson(prompt, 1400);
    wordCache.clear();
    clickedWords.length = 0;
    renderReadingSet();
    recordSession('reading-generated', `Generated reading set: ${currentReadingSet.title}`);
  } catch (error) {
    showInlineError(els.readingEmpty, `Could not generate reading set: ${error.message}`);
  } finally {
    setLoadingState('reading', false);
  }
}

function resetReadingUi() {
  els.readingEmpty.classList.add('hidden');
  els.readingContent.classList.add('hidden');
  els.readingQuestionsCard.classList.add('hidden');
  els.vocabQuizCard.classList.add('hidden');
  els.quizComplete.classList.add('hidden');
  els.readingResults.classList.add('hidden');
}

function renderReadingSet() {
  if (!currentReadingSet) return;

  els.readingEmpty.classList.add('hidden');
  els.readingContent.classList.remove('hidden');
  els.readingTrackBadge.textContent = TRACKS[els.trackSelect.value].label;
  els.readingTypeBadge.textContent = currentReadingSet.typeLabel || currentReadingSet.topic || 'Reading';
  els.readingTitle.textContent = currentReadingSet.title || 'Reading Set';
  renderWordText(currentReadingSet.passage, els.readingText);
  renderSimpleList(
    els.readingObjectives,
    (currentReadingSet.objectives || []).map(text => ({ title: text, body: '' })),
    'Objectives will appear here.'
  );
  updateLookedUpCount();
}

function renderWordText(text, container) {
  container.innerHTML = '';

  text.split('\n').forEach((line, index) => {
    if (index > 0) container.appendChild(document.createElement('br'));
    line.split(/(\s+)/).forEach(token => {
      if (/^\s+$/.test(token)) {
        container.appendChild(document.createTextNode(token));
        return;
      }
      if (!token) return;
      const span = document.createElement('span');
      span.className = 'word';
      span.textContent = token;
      span.addEventListener('click', event => {
        event.stopPropagation();
        onWordClick(span, token);
      });
      container.appendChild(span);
    });
  });
}

function onWordClick(span, displayWord) {
  const clean = cleanWord(displayWord);
  if (!clean || !currentReadingSet) return;

  if (activePopup === clean) {
    closePopup();
    return;
  }

  closePopup();
  activePopup = clean;
  span.classList.add('looked-up', 'popup-open');

  if (!wordCache.has(clean)) {
    clickedWords.push(clean);
    wordCache.set(clean, null);
    fetchTranslation(clean, displayWord);
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

  const popupWidth = 280;
  const left = Math.min(
    Math.max(8, rect.left + window.scrollX - 4),
    window.innerWidth - popupWidth - 8
  );

  popup.style.top = `${rect.bottom + window.scrollY + 10}px`;
  popup.style.left = `${left}px`;

  const arrowLeft = Math.max(10, rect.left + window.scrollX + rect.width / 2 - left - 6);
  popup.innerHTML = cached
    ? (cached.error ? popupErrorHtml(displayWord) : popupContentHtml(displayWord, cached))
    : popupLoadingHtml(displayWord);

  document.body.appendChild(popup);
  const arrowStyle = document.createElement('style');
  arrowStyle.id = 'popupArrowStyle';
  arrowStyle.textContent = `#wordPopup::before { left: ${arrowLeft}px; }`;
  document.head.appendChild(arrowStyle);

  setTimeout(() => {
    document.addEventListener('click', onDocClick);
    window.addEventListener('scroll', closePopup, { once: true, passive: true });
  }, 0);
}

function onDocClick(event) {
  const popup = document.getElementById('wordPopup');
  if (popup && !popup.contains(event.target)) closePopup();
}

function closePopup() {
  document.getElementById('wordPopup')?.remove();
  document.getElementById('popupArrowStyle')?.remove();
  document.removeEventListener('click', onDocClick);
  if (activePopup) {
    document.querySelectorAll('.popup-open').forEach(node => node.classList.remove('popup-open'));
  }
  activePopup = null;
}

function popupLoadingHtml(word) {
  return `<div class="popup-loading">
    <div class="popup-spinner"></div>
    <span>Looking up <strong>${escapeHtml(word)}</strong>…</span>
  </div>`;
}

function popupErrorHtml(word) {
  return `<div class="popup-error">Could not translate <strong>${escapeHtml(word)}</strong>. Try another word.</div>`;
}

function popupContentHtml(word, translation) {
  return `<div class="popup-body">
    <div class="popup-word">${escapeHtml(word)}</div>
    ${translation.romanization ? `<div class="popup-romanization">${escapeHtml(translation.romanization)}</div>` : ''}
    ${translation.pos ? `<span class="popup-pos">${escapeHtml(translation.pos)}</span>` : ''}
    <div class="popup-meaning">${escapeHtml(translation.meaning)}</div>
  </div>`;
}

async function fetchTranslation(clean, displayWord) {
  const prompt = `
Return valid JSON only.
Context: ${currentReadingSet ? currentReadingSet.passage : ''}
Translate the Korean token "${clean}" as used in this passage.
JSON shape:
{"romanization":"...","pos":"...","meaning":"1-6 word meaning"}
`;

  try {
    const data = await callJson(prompt, 140);
    const saved = {
      romanization: data.romanization || '',
      pos: data.pos || '',
      meaning: data.meaning || clean,
    };
    wordCache.set(clean, saved);
    saveWordToNotebook(clean, saved);
  } catch {
    wordCache.set(clean, { error: true });
  }

  updatePopupIfOpen(clean, displayWord);
}

function updatePopupIfOpen(clean, displayWord) {
  if (activePopup !== clean) return;
  const popup = document.getElementById('wordPopup');
  const cached = wordCache.get(clean);
  if (!popup || !cached) return;
  popup.innerHTML = cached.error ? popupErrorHtml(displayWord) : popupContentHtml(displayWord, cached);
}

function updateLookedUpCount() {
  const count = clickedWords.length;
  els.lookedUpCount.textContent = `${count} word${count === 1 ? '' : 's'} looked up`;
}

function openReadingQuestions() {
  if (!currentReadingSet?.questions?.length) return;
  els.readingQuestionsCard.classList.remove('hidden');
  els.readingResults.classList.add('hidden');
  els.readingQuestionStats.textContent = `${currentReadingSet.questions.length} questions`;
  els.readingQuestionsList.innerHTML = '';

  currentReadingSet.questions.forEach((question, index) => {
    const card = document.createElement('article');
    card.className = 'question-card';
    card.innerHTML = `
      <div class="question-top">
        <strong>Q${index + 1}</strong>
        <span class="skill-chip">${escapeHtml(question.skill || 'reading')}</span>
      </div>
      <p class="question-prompt">${escapeHtml(question.prompt)}</p>
      <div class="options-group">
        ${question.options.map((option, optionIndex) => `
          <label class="option-row">
            <input type="radio" name="reading-question-${index}" value="${optionIndex}" />
            <span>${escapeHtml(option)}</span>
          </label>
        `).join('')}
      </div>
    `;
    els.readingQuestionsList.appendChild(card);
  });
}

function submitReadingQuestions() {
  if (!currentReadingSet?.questions?.length) return;

  let correct = 0;
  const resultRows = [];

  currentReadingSet.questions.forEach((question, index) => {
    const checked = document.querySelector(`input[name="reading-question-${index}"]:checked`);
    const selected = checked ? Number(checked.value) : null;
    const isCorrect = selected === question.answerIndex;
    if (isCorrect) correct += 1;

    progress.questionHistory.push({
      category: 'reading-question',
      correct: isCorrect,
      skill: question.skill || 'reading',
      createdAt: Date.now(),
    });

    if (!isCorrect) {
      pushMistake({
        category: 'reading',
        prompt: question.prompt,
        userAnswer: selected === null ? 'No answer' : question.options[selected],
        correctAnswer: question.options[question.answerIndex],
        explanation: question.explanation,
      });
    }

    resultRows.push(`
      <div class="result-item ${isCorrect ? 'is-correct' : 'is-wrong'}">
        <strong>Q${index + 1}: ${isCorrect ? 'Correct' : 'Wrong'}</strong>
        <p>${escapeHtml(question.explanation)}</p>
      </div>
    `);
  });

  progress.readingSetsCompleted += 1;
  recordSession('reading-submitted', `Completed reading questions: ${correct}/${currentReadingSet.questions.length}`);
  persistProgress();
  renderDashboard();
  renderReviewNotebook();

  els.readingResults.innerHTML = `
    <div class="results-summary">
      <strong>Score: ${correct}/${currentReadingSet.questions.length}</strong>
      <span>${Math.round((correct / currentReadingSet.questions.length) * 100)}% accuracy</span>
    </div>
    ${resultRows.join('')}
  `;
  els.readingResults.classList.remove('hidden');
}

function startClickedWordQuiz() {
  const readyWords = clickedWords.filter(word => {
    const cached = wordCache.get(word);
    return cached && !cached.error;
  });

  if (readyWords.length < 2) {
    window.alert('Look up at least 2 words first.');
    return;
  }

  els.vocabQuizCard.classList.remove('hidden');
  buildQuiz(
    readyWords.map(word => ({ korean: word, ...wordCache.get(word) })),
    {
      koreanColumn: els.koreanColumn,
      englishColumn: els.englishColumn,
      completeEl: els.quizComplete,
      matchedEl: els.quizMatched,
      totalEl: els.quizTotal,
      mistakesWrap: els.quizMistakes,
      mistakesCountEl: els.mistakesCount,
      mistakesPluralEl: els.mistakesPlural,
      completionTextEl: els.completionText,
      onFinish: finalMistakes => {
        recordSession('vocab-quiz', `Completed vocab quiz with ${finalMistakes} mistakes`);
        persistProgress();
        renderDashboard();
      },
    }
  );
}

function buildQuiz(sourceItems, refs) {
  quizItems = sourceItems.map((item, index) => ({
    id: index,
    korean: item.korean,
    english: item.meaning,
    romanization: item.romanization || '',
  }));
  selectedKorean = null;
  matchedCount = 0;
  mistakes = 0;

  const koreanOrder = shuffle([...quizItems]);
  const englishOrder = shuffle([...quizItems]);

  refs.koreanColumn.innerHTML = '<div class="column-label">Korean</div>';
  refs.englishColumn.innerHTML = '<div class="column-label">Meaning</div>';
  refs.completeEl.classList.add('hidden');
  refs.matchedEl.textContent = '0';
  refs.totalEl.textContent = String(quizItems.length);
  refs.mistakesWrap.classList.add('hidden');

  koreanOrder.forEach(item => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.textContent = item.korean;
    card.dataset.id = String(item.id);
    card.dataset.side = 'korean';
    card.addEventListener('click', () => onQuizClick(card, 'korean', item.id, refs));
    refs.koreanColumn.appendChild(card);
  });

  englishOrder.forEach(item => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.textContent = item.english;
    card.dataset.id = String(item.id);
    card.dataset.side = 'english';
    card.addEventListener('click', () => onQuizClick(card, 'english', item.id, refs));
    refs.englishColumn.appendChild(card);
  });
}

function onQuizClick(card, side, id, refs) {
  if (card.classList.contains('matched') || card.classList.contains('wrong')) return;

  if (side === 'korean') {
    clearSelection(refs.koreanColumn);
    if (selectedKorean === id) {
      selectedKorean = null;
    } else {
      selectedKorean = id;
      card.classList.add('selected');
    }
    return;
  }

  if (selectedKorean === null) return;

  if (selectedKorean === id) {
    markMatched(id, refs);
  } else {
    mistakes += 1;
    flashWrong(selectedKorean, id, refs);
    refs.mistakesWrap.classList.remove('hidden');
    refs.mistakesCountEl.textContent = String(mistakes);
    refs.mistakesPluralEl.textContent = mistakes === 1 ? '' : 's';
    clearSelection(refs.koreanColumn);
    selectedKorean = null;
  }
}

function clearSelection(container) {
  container.querySelectorAll('.selected').forEach(node => node.classList.remove('selected'));
}

function markMatched(id, refs) {
  const scope = refs.koreanColumn.parentElement;
  scope.querySelectorAll(`.quiz-card[data-id="${id}"]`).forEach(node => {
    node.classList.remove('selected', 'wrong');
    node.classList.add('matched');
  });

  matchedCount += 1;
  selectedKorean = null;
  refs.matchedEl.textContent = String(matchedCount);

  if (matchedCount === quizItems.length) {
    refs.completeEl.classList.remove('hidden');
    refs.completionTextEl.innerHTML = mistakes === 0
      ? '<strong>Perfect score.</strong> Your saved vocabulary held up.'
      : `Matched all words with <strong>${mistakes} mistake${mistakes === 1 ? '' : 's'}</strong>.`;
    refs.onFinish?.(mistakes);
  }
}

function flashWrong(koreanId, englishId, refs) {
  const korCard = refs.koreanColumn.querySelector(`.quiz-card[data-id="${koreanId}"]`);
  const engCard = refs.englishColumn.querySelector(`.quiz-card[data-id="${englishId}"]`);
  [korCard, engCard].forEach(card => {
    if (!card) return;
    card.classList.add('wrong');
    setTimeout(() => card.classList.remove('wrong'), 420);
  });
}

async function generateListeningSet() {
  setLoadingState('listening', true);
  els.listeningFeedback.classList.add('hidden');
  els.listeningTranscriptBox.classList.add('hidden');

  const track = TRACKS[els.trackSelect.value];
  const type = els.listeningTypeSelect.value;
  const prompt = `
Return valid JSON only.
Create a TOPIK-style listening drill for ${track.label}.
Listening type: ${type}
Tone: ${track.listeningTone}

JSON shape:
{
  "title": "...",
  "typeLabel": "...",
  "script": "Natural Korean script to be read aloud. 2-5 sentences.",
  "question": "Question about the audio",
  "options": ["...", "...", "...", "..."],
  "answerIndex": 0,
  "explanation": "short explanation in English",
  "transcriptNotes": ["...", "..."]
}
Avoid markdown.
`;

  try {
    currentListeningSet = await callJson(prompt, 900);
    renderListeningSet();
    recordSession('listening-generated', `Generated listening drill: ${currentListeningSet.title}`);
  } catch (error) {
    showInlineError(els.listeningEmpty, `Could not generate listening drill: ${error.message}`);
  } finally {
    setLoadingState('listening', false);
  }
}

function renderListeningSet() {
  if (!currentListeningSet) return;

  els.listeningEmpty.classList.add('hidden');
  els.listeningContent.classList.remove('hidden');
  els.listeningTrackBadge.textContent = TRACKS[els.trackSelect.value].label;
  els.listeningTypeBadge.textContent = currentListeningSet.typeLabel || els.listeningTypeSelect.value;
  els.listeningPromptTitle.textContent = currentListeningSet.title || 'Listening Drill';
  els.listeningQuestion.innerHTML = `
    <p class="question-prompt">${escapeHtml(currentListeningSet.question)}</p>
    <div class="options-group">
      ${currentListeningSet.options.map((option, index) => `
        <label class="option-row">
          <input type="radio" name="listening-option" value="${index}" />
          <span>${escapeHtml(option)}</span>
        </label>
      `).join('')}
    </div>
  `;
  els.listeningFeedback.classList.add('hidden');
  els.listeningTranscriptBox.classList.add('hidden');
  els.listeningTranscriptBox.innerHTML = '';
}

function playListening(forceReplay) {
  if (!currentListeningSet?.script) return;
  if (!window.speechSynthesis) {
    window.alert('Speech synthesis is not available in this environment.');
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(currentListeningSet.script);
  utterance.lang = 'ko-KR';
  utterance.rate = forceReplay ? 0.92 : 1;
  window.speechSynthesis.speak(utterance);
}

function revealTranscript() {
  if (!currentListeningSet) return;
  els.listeningTranscriptBox.classList.remove('hidden');
  els.listeningTranscriptBox.innerHTML = `
    <strong>Transcript</strong>
    <p>${escapeHtml(currentListeningSet.script)}</p>
    ${(currentListeningSet.transcriptNotes || []).map(note => `<div class="bullet-chip">${escapeHtml(note)}</div>`).join('')}
  `;
}

function submitListeningAnswer() {
  if (!currentListeningSet) return;
  const checked = document.querySelector('input[name="listening-option"]:checked');
  const selected = checked ? Number(checked.value) : null;
  const isCorrect = selected === currentListeningSet.answerIndex;

  progress.questionHistory.push({
    category: 'listening',
    correct: isCorrect,
    createdAt: Date.now(),
  });

  if (!isCorrect) {
    pushMistake({
      category: 'listening',
      prompt: currentListeningSet.question,
      userAnswer: selected === null ? 'No answer' : currentListeningSet.options[selected],
      correctAnswer: currentListeningSet.options[currentListeningSet.answerIndex],
      explanation: currentListeningSet.explanation,
    });
  }

  progress.listeningSetsCompleted += 1;
  recordSession('listening-submitted', `Completed listening drill: ${isCorrect ? 'correct' : 'wrong'}`);
  persistProgress();
  renderDashboard();
  renderReviewNotebook();

  els.listeningFeedback.classList.remove('hidden');
  els.listeningFeedback.innerHTML = `
    <div class="results-summary">
      <strong>${isCorrect ? 'Correct' : 'Not quite'}</strong>
      <span>${escapeHtml(currentListeningSet.options[currentListeningSet.answerIndex])}</span>
    </div>
    <p>${escapeHtml(currentListeningSet.explanation)}</p>
  `;
}

async function generateWritingTask() {
  setLoadingState('writing', true);
  els.writingFeedbackCard.classList.add('hidden');

  const track = TRACKS[els.trackSelect.value];
  const type = els.writingTypeSelect.value;
  const prompt = `
Return valid JSON only.
Create a TOPIK-style writing task for ${track.label}.
Task type: ${type}

JSON shape:
{
  "title": "...",
  "typeLabel": "...",
  "prompt": "...",
  "recommendedLength": "e.g. 180-220 characters",
  "guidance": ["...", "...", "..."],
  "checklist": ["...", "...", "..."]
}
Avoid markdown.
`;

  try {
    currentWritingTask = await callJson(prompt, 700);
    renderWritingTask();
    recordSession('writing-generated', `Generated writing task: ${currentWritingTask.title}`);
  } catch (error) {
    showInlineError(els.writingEmpty, `Could not generate writing task: ${error.message}`);
  } finally {
    setLoadingState('writing', false);
  }
}

function renderWritingTask() {
  if (!currentWritingTask) return;

  els.writingEmpty.classList.add('hidden');
  els.writingContent.classList.remove('hidden');
  els.writingTrackBadge.textContent = TRACKS[els.trackSelect.value].label;
  els.writingTypeBadge.textContent = currentWritingTask.typeLabel || els.writingTypeSelect.value;
  els.writingTitle.textContent = currentWritingTask.title || 'Writing Task';
  els.writingPrompt.textContent = currentWritingTask.prompt;
  renderSimpleList(
    els.writingGuidance,
    [
      ...(currentWritingTask.guidance || []).map(item => ({ title: item, body: '' })),
      ...(currentWritingTask.checklist || []).map(item => ({ title: `Check: ${item}`, body: '' })),
    ],
    'Guidance will appear here.'
  );
  els.writingAnswer.value = '';
  updateWritingCharCount();
}

function updateWritingCharCount() {
  const count = els.writingAnswer.value.length;
  els.writingCharCount.textContent = `${count} chars`;
}

async function evaluateWriting() {
  if (!currentWritingTask) {
    window.alert('Generate a writing task first.');
    return;
  }

  const answer = els.writingAnswer.value.trim();
  if (!answer) {
    window.alert('Write an answer first.');
    return;
  }

  els.evaluateWritingBtn.disabled = true;
  els.writingFeedbackCard.classList.remove('hidden');
  els.writingFeedback.innerHTML = '<div class="loading-inline">Evaluating your writing…</div>';

  const prompt = `
Return valid JSON only.
You are grading a TOPIK-style Korean writing response.

Track: ${TRACKS[els.trackSelect.value].label}
Task:
${currentWritingTask.prompt}

Student answer:
${answer}

JSON shape:
{
  "estimatedBand": "...",
  "overall": "...",
  "strengths": ["...", "..."],
  "improvements": ["...", "...", "..."],
  "grammarNotes": ["...", "..."],
  "modelOutline": ["...", "...", "..."]
}
Avoid markdown.
`;

  try {
    const feedback = await callJson(prompt, 1000);
    renderWritingFeedback(feedback, answer);
    progress.writingEvaluations.push({
      createdAt: Date.now(),
      title: currentWritingTask.title,
      estimatedBand: feedback.estimatedBand,
      overall: feedback.overall,
      improvements: feedback.improvements || [],
    });
    recordSession('writing-evaluated', `Evaluated writing task: ${currentWritingTask.title}`);
    persistProgress();
    renderDashboard();
    renderReviewNotebook();
  } catch (error) {
    els.writingFeedback.innerHTML = `<div class="error-inline">${escapeHtml(error.message)}</div>`;
  } finally {
    els.evaluateWritingBtn.disabled = false;
  }
}

function renderWritingFeedback(feedback, answer) {
  const blocks = [
    { title: 'Estimated Band', items: [feedback.estimatedBand || 'Unknown'] },
    { title: 'Overall', items: [feedback.overall || 'No summary returned.'] },
    { title: 'Strengths', items: feedback.strengths || [] },
    { title: 'Improvements', items: feedback.improvements || [] },
    { title: 'Grammar Notes', items: feedback.grammarNotes || [] },
    { title: 'Model Outline', items: feedback.modelOutline || [] },
  ];

  els.writingFeedback.innerHTML = blocks.map(block => `
    <div class="feedback-card">
      <strong>${escapeHtml(block.title)}</strong>
      <div class="stack-list mini-list">
        ${block.items.map(item => `<div class="stack-item"><p>${escapeHtml(item)}</p></div>`).join('') || '<div class="stack-item"><p>No feedback.</p></div>'}
      </div>
    </div>
  `).join('');

  const lesson = (feedback.improvements || [])[0];
  if (lesson) {
    progress.mistakeNotebook.unshift({
      category: 'writing',
      prompt: currentWritingTask.prompt,
      userAnswer: answer.slice(0, 180),
      correctAnswer: feedback.modelOutline?.join(' / ') || 'See feedback',
      explanation: lesson,
      createdAt: Date.now(),
    });
    trimMistakeNotebook();
  }
}

async function generateMockExam() {
  setLoadingState('mock', true);
  stopMockTimer();
  els.mockResults.classList.add('hidden');

  const track = TRACKS[els.trackSelect.value];
  const prompt = `
Return valid JSON only.
Create a compact TOPIK mini mock for ${track.label}.

JSON shape:
{
  "title": "...",
  "minutes": ${track.mockMinutes},
  "sections": [
    {
      "type": "reading",
      "title": "...",
      "passage": "Korean passage",
      "questions": [
        {
          "prompt": "...",
          "options": ["...", "...", "...", "..."],
          "answerIndex": 0,
          "explanation": "..."
        }
      ]
    },
    {
      "type": "listening-script",
      "title": "...",
      "passage": "Short Korean script that the learner can read/listen to",
      "questions": [
        {
          "prompt": "...",
          "options": ["...", "...", "...", "..."],
          "answerIndex": 0,
          "explanation": "..."
        }
      ]
    },
    {
      "type": "writing-check",
      "title": "...",
      "prompt": "...",
      "rubric": ["...", "...", "..."]
    }
  ]
}

Rules:
- Include exactly 2 reading questions and 1 listening-script question.
- The writing-check section should be a short response prompt and self-check rubric.
- Avoid markdown.
`;

  try {
    currentMockExam = await callJson(prompt, 1500);
    renderMockExam();
    startMockTimer((currentMockExam.minutes || track.mockMinutes) * 60);
    recordSession('mock-generated', `Generated mini mock: ${currentMockExam.title}`);
  } catch (error) {
    showInlineError(els.mockEmpty, `Could not generate mini mock: ${error.message}`);
  } finally {
    setLoadingState('mock', false);
  }
}

function renderMockExam() {
  if (!currentMockExam) return;

  els.mockEmpty.classList.add('hidden');
  els.mockContent.classList.remove('hidden');
  els.mockTrackBadge.textContent = TRACKS[els.trackSelect.value].label;
  els.mockTitle.textContent = currentMockExam.title || 'Mini Mock';
  els.mockSections.innerHTML = '';

  currentMockExam.sections.forEach((section, sectionIndex) => {
    const wrapper = document.createElement('section');
    wrapper.className = 'mock-section-card';

    if (section.type === 'writing-check') {
      wrapper.innerHTML = `
        <div class="mock-section-head">
          <strong>${escapeHtml(section.title)}</strong>
          <span class="skill-chip">writing</span>
        </div>
        <p class="question-prompt">${escapeHtml(section.prompt)}</p>
        <textarea class="writing-area mini-area" data-mock-writing="${sectionIndex}" placeholder="Write your answer in Korean."></textarea>
        <div class="stack-list mini-list">
          ${(section.rubric || []).map(item => `<div class="stack-item"><p>${escapeHtml(item)}</p></div>`).join('')}
        </div>
      `;
    } else {
      wrapper.innerHTML = `
        <div class="mock-section-head">
          <strong>${escapeHtml(section.title)}</strong>
          <span class="skill-chip">${escapeHtml(section.type)}</span>
        </div>
        <div class="mock-passage">${escapeHtml(section.passage || '')}</div>
        ${(section.questions || []).map((question, questionIndex) => `
          <div class="question-card mock-question">
            <p class="question-prompt">${escapeHtml(question.prompt)}</p>
            <div class="options-group">
              ${question.options.map((option, optionIndex) => `
                <label class="option-row">
                  <input type="radio" name="mock-${sectionIndex}-${questionIndex}" value="${optionIndex}" />
                  <span>${escapeHtml(option)}</span>
                </label>
              `).join('')}
            </div>
          </div>
        `).join('')}
      `;
    }

    els.mockSections.appendChild(wrapper);
  });
}

function startMockTimer(seconds) {
  mockTimeRemaining = seconds;
  updateMockTimer();
  stopMockTimer();
  mockTimerInterval = setInterval(() => {
    mockTimeRemaining -= 1;
    updateMockTimer();
    if (mockTimeRemaining <= 0) {
      stopMockTimer();
      submitMockExam();
    }
  }, 1000);
}

function stopMockTimer() {
  if (mockTimerInterval) {
    clearInterval(mockTimerInterval);
    mockTimerInterval = null;
  }
}

function updateMockTimer() {
  const minutes = Math.max(0, Math.floor(mockTimeRemaining / 60));
  const seconds = Math.max(0, mockTimeRemaining % 60);
  els.mockTimer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function submitMockExam() {
  if (!currentMockExam) return;
  stopMockTimer();

  let total = 0;
  let correct = 0;
  const resultRows = [];

  currentMockExam.sections.forEach((section, sectionIndex) => {
    if (section.type === 'writing-check') return;

    (section.questions || []).forEach((question, questionIndex) => {
      total += 1;
      const checked = document.querySelector(`input[name="mock-${sectionIndex}-${questionIndex}"]:checked`);
      const selected = checked ? Number(checked.value) : null;
      const isCorrect = selected === question.answerIndex;
      if (isCorrect) correct += 1;

      progress.questionHistory.push({
        category: 'mock',
        correct: isCorrect,
        createdAt: Date.now(),
      });

      if (!isCorrect) {
        pushMistake({
          category: 'mock',
          prompt: question.prompt,
          userAnswer: selected === null ? 'No answer' : question.options[selected],
          correctAnswer: question.options[question.answerIndex],
          explanation: question.explanation,
        });
      }

      resultRows.push(`
        <div class="result-item ${isCorrect ? 'is-correct' : 'is-wrong'}">
          <strong>${escapeHtml(section.title)}: ${isCorrect ? 'Correct' : 'Wrong'}</strong>
          <p>${escapeHtml(question.explanation)}</p>
        </div>
      `);
    });
  });

  const writingResponse = document.querySelector('[data-mock-writing]')?.value.trim() || '';
  progress.mockHistory.push({
    createdAt: Date.now(),
    title: currentMockExam.title,
    score: total ? Math.round((correct / total) * 100) : 0,
    writingLength: writingResponse.length,
  });
  recordSession('mock-submitted', `Completed mini mock: ${correct}/${total}`);
  persistProgress();
  renderDashboard();
  renderReviewNotebook();

  els.mockResults.classList.remove('hidden');
  els.mockResults.innerHTML = `
    <div class="results-summary">
      <strong>Mini Mock Score: ${correct}/${total}</strong>
      <span>${total ? Math.round((correct / total) * 100) : 0}% accuracy</span>
    </div>
    ${writingResponse ? `<div class="result-item"><strong>Writing response captured</strong><p>${escapeHtml(writingResponse.slice(0, 220))}${writingResponse.length > 220 ? '…' : ''}</p></div>` : '<div class="result-item is-wrong"><strong>No writing answer submitted</strong><p>Add a short response next time to train output under time pressure.</p></div>'}
    ${resultRows.join('')}
  `;
}

function renderReviewNotebook() {
  const savedWords = Object.entries(progress.savedWords)
    .sort((a, b) => b[1].seenAt - a[1].seenAt)
    .slice(0, 12)
    .map(([word, data]) => ({
      title: `${word} · ${data.meaning}`,
      body: [data.pos, data.romanization].filter(Boolean).join(' · ') || 'Saved from reading lookup',
    }));

  renderSimpleList(els.savedWordsList, savedWords, 'Look up words in Reading Lab and they will appear here.');

  renderSimpleList(
    els.mistakeNotebookList,
    progress.mistakeNotebook.slice(0, 10).map(item => ({
      title: `${capitalize(item.category)}: ${item.prompt}`,
      body: `You answered "${item.userAnswer}". Correct: "${item.correctAnswer}". ${item.explanation}`,
    })),
    'Mistakes from reading, listening, mock, and writing feedback will appear here.'
  );

  renderSimpleList(
    els.writingLessonsList,
    progress.writingEvaluations.slice(-6).reverse().map(item => ({
      title: `${item.title} · ${item.estimatedBand || 'No band'}`,
      body: item.improvements?.[0] || item.overall,
    })),
    'Writing feedback will appear here after your first submission.'
  );
}

function startSavedWordQuiz() {
  const words = Object.entries(progress.savedWords).slice(0, 8).map(([word, data]) => ({
    korean: word,
    meaning: data.meaning,
    romanization: data.romanization,
  }));

  if (words.length < 2) {
    window.alert('Save at least 2 words from Reading Lab first.');
    return;
  }

  els.savedQuizCard.classList.remove('hidden');
  savedQuizItems = words.map((item, index) => ({ id: index, ...item }));
  savedSelectedKorean = null;
  savedMatchedCount = 0;

  const koreanOrder = shuffle([...savedQuizItems]);
  const englishOrder = shuffle([...savedQuizItems]);

  els.savedKoreanColumn.innerHTML = '<div class="column-label">Korean</div>';
  els.savedEnglishColumn.innerHTML = '<div class="column-label">Meaning</div>';
  els.savedQuizComplete.classList.add('hidden');

  koreanOrder.forEach(item => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.textContent = item.korean;
    card.dataset.id = String(item.id);
    card.dataset.side = 'korean';
    card.addEventListener('click', () => onSavedQuizClick(card, 'korean', item.id));
    els.savedKoreanColumn.appendChild(card);
  });

  englishOrder.forEach(item => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.textContent = item.meaning;
    card.dataset.id = String(item.id);
    card.dataset.side = 'english';
    card.addEventListener('click', () => onSavedQuizClick(card, 'english', item.id));
    els.savedEnglishColumn.appendChild(card);
  });
}

function onSavedQuizClick(card, side, id) {
  if (card.classList.contains('matched') || card.classList.contains('wrong')) return;

  if (side === 'korean') {
    clearSelection(els.savedKoreanColumn);
    if (savedSelectedKorean === id) {
      savedSelectedKorean = null;
    } else {
      savedSelectedKorean = id;
      card.classList.add('selected');
    }
    return;
  }

  if (savedSelectedKorean === null) return;

  if (savedSelectedKorean === id) {
    document.querySelectorAll(`#savedQuizBoard .quiz-card[data-id="${id}"]`).forEach(node => {
      node.classList.remove('selected', 'wrong');
      node.classList.add('matched');
    });
    savedSelectedKorean = null;
    savedMatchedCount += 1;
    if (savedMatchedCount === savedQuizItems.length) {
      els.savedQuizComplete.classList.remove('hidden');
      els.savedQuizCompletionText.innerHTML = '<strong>Saved vocab cleared.</strong> Keep feeding this queue from Reading Lab.';
      recordSession('saved-vocab-quiz', 'Completed saved vocabulary quiz');
      persistProgress();
      renderDashboard();
    }
  } else {
    const korCard = els.savedKoreanColumn.querySelector(`.quiz-card[data-id="${savedSelectedKorean}"]`);
    [korCard, card].forEach(node => {
      if (!node) return;
      node.classList.add('wrong');
      setTimeout(() => node.classList.remove('wrong'), 420);
    });
    clearSelection(els.savedKoreanColumn);
    savedSelectedKorean = null;
  }
}

function saveWordToNotebook(word, data) {
  const previous = progress.savedWords[word] || {};
  progress.savedWords[word] = {
    ...previous,
    meaning: data.meaning,
    pos: data.pos,
    romanization: data.romanization,
    seenAt: Date.now(),
    reviewCount: (previous.reviewCount || 0) + 1,
  };
  persistProgress();
  renderDashboard();
  renderReviewNotebook();
}

function pushMistake(entry) {
  progress.mistakeNotebook.unshift({
    ...entry,
    createdAt: Date.now(),
  });
  trimMistakeNotebook();
}

function trimMistakeNotebook() {
  progress.mistakeNotebook = progress.mistakeNotebook.slice(0, 30);
}

function recordSession(type, title) {
  progress.sessions.push({
    type,
    title,
    createdAt: Date.now(),
  });
  progress.sessions = progress.sessions.slice(-40);
  persistProgress();
}

function renderSimpleList(container, items, emptyText) {
  if (!items.length) {
    container.innerHTML = `<div class="empty-inline">${escapeHtml(emptyText)}</div>`;
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="stack-item">
      <strong>${escapeHtml(item.title)}</strong>
      ${item.body ? `<p>${escapeHtml(item.body)}</p>` : ''}
    </div>
  `).join('');
}

function setLoadingState(mode, isLoading) {
  const config = {
    reading: [els.readingLoading, els.readingEmpty],
    listening: [els.listeningLoading, els.listeningEmpty],
    writing: [els.writingLoading, els.writingEmpty],
    mock: [els.mockLoading, els.mockEmpty],
  };

  const [loadingEl] = config[mode];
  loadingEl.classList.toggle('hidden', !isLoading);

  if (mode === 'reading') {
    els.generateReadingBtn.disabled = isLoading;
  } else if (mode === 'listening') {
    els.generateListeningBtn.disabled = isLoading;
  } else if (mode === 'writing') {
    els.generateWritingBtn.disabled = isLoading;
  } else if (mode === 'mock') {
    els.generateMockBtn.disabled = isLoading;
  }
}

function showInlineError(container, message) {
  container.classList.remove('hidden');
  container.innerHTML = `<div class="error-inline">${escapeHtml(message)}</div>`;
}

async function callJson(prompt, maxTokens = 1200) {
  const result = await callOpenAI(
    [
      { role: 'system', content: 'You are a TOPIK study content generator. Always return strict JSON with double-quoted keys.' },
      { role: 'user', content: prompt },
    ],
    maxTokens,
    0.8,
    { type: 'json_object' }
  );

  try {
    return JSON.parse(result);
  } catch {
    const match = result.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Model did not return valid JSON.');
    return JSON.parse(match[0]);
  }
}

async function callOpenAI(messages, maxTokens = 1000, temperature = 0.8, responseFormat = null) {
  const body = {
    model: 'gpt-4o-mini',
    messages,
    max_tokens: maxTokens,
    temperature,
  };

  if (responseFormat) body.response_format = responseFormat;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

function cleanWord(token) {
  return token.replace(/^[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]+|[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]+$/g, '') || token;
}

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function capitalize(value) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatRelativeDate(timestamp) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function cloneDefaultProgress() {
  return JSON.parse(JSON.stringify(DEFAULT_PROGRESS));
}
