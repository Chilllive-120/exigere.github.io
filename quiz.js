/* ===== Настройки ===== */
const PRESETS = [1, 5, 10, 20, 'all']; // кнопки выбора количества
const DEFAULT_COUNT = 5;               // значение по умолчанию
const PASS_PERCENT = 80;               // порог сдачи (было: 4 из 5 = 80%)
const SHUFFLE_ANSWERS = false;         // true — перемешивать варианты ответов
                                       // (включайте, только если нет ответов вида «все перечисленные»)

/* ===== Состояние ===== */
let currentQuestions = [];
let userAnswers = {};
let examCompleted = false;
let chosenCount = DEFAULT_COUNT;

const $ = id => document.getElementById(id);
const clean = t => t.replace(/^\*/, '').trim();       // убирает ведущую «*» (раньше не работало)
const isCorrectAnswer = a => a.startsWith('*');

/* Перемешивание Фишера–Йетса (одной функции достаточно) */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickQuestions(n) {
  return shuffle(questions).slice(0, n).map(q => {
    const answers = SHUFFLE_ANSWERS ? shuffle(q.answers) : q.answers;
    return { ...q, answers };
  });
}

function passNeeded(total) {
  return Math.max(1, Math.ceil(total * PASS_PERCENT / 100));
}

/* ===== Стартовый экран ===== */
function setCount(n) {
  chosenCount = Math.min(Math.max(1, n), questions.length);
  document.querySelectorAll('.chip').forEach(c =>
    c.setAttribute('aria-pressed', String(Number(c.dataset.n) === chosenCount)));
  $('rule').textContent =
    `Для сдачи нужно ответить правильно минимум на ${passNeeded(chosenCount)} из ${chosenCount} (${PASS_PERCENT}%).`;
}

function initStart() {
  $('max').textContent = `(максимум ${questions.length})`;
  $('custom').max = questions.length;
  PRESETS.forEach(p => {
    const n = p === 'all' ? questions.length : p;
    if (n > questions.length) return;
    const b = document.createElement('button');
    b.className = 'chip';
    b.dataset.n = n;
    b.textContent = p === 'all' ? `Все (${questions.length})` : p;
    b.onclick = () => { $('custom').value = ''; setCount(n); };
    $('chips').appendChild(b);
  });
  $('custom').addEventListener('input', e => {
    const v = parseInt(e.target.value, 10);
    if (v > 0) setCount(v);
  });
  $('begin').onclick = startExam;
  setCount(DEFAULT_COUNT);
}

/* ===== Тест ===== */
function startExam() {
  currentQuestions = pickQuestions(chosenCount);
  userAnswers = {};
  examCompleted = false;
  $('start').classList.add('hidden');
  $('results').classList.add('hidden');
  $('exam').classList.remove('hidden');
  $('submit-btn').classList.remove('hidden');
  displayQuestions();
  window.scrollTo(0, 0);
}

function updateProgress() {
  const done = Object.keys(userAnswers).length;
  const total = currentQuestions.length;
  $('progress').textContent = `Отвечено: ${done} из ${total}`;
  $('barfill').style.width = `${(done / total) * 100}%`;
  $('submit-btn').disabled = done !== total;
}

function displayQuestions() {
  const box = $('quiz-container');
  box.innerHTML = '';

  currentQuestions.forEach((q, i) => {
    const card = document.createElement('div');
    card.className = 'card q';

    const head = document.createElement('div');
    head.className = 'q-head';

    const title = document.createElement('div');
    title.className = 'q-title';
    const n = document.createElement('span');
    n.className = 'n';
    n.textContent = `${i + 1}.`;
    title.append(n, q.question);
    head.appendChild(title);

    // Необязательная картинка: справа от вопроса (на телефоне — над ответами),
    // небольшая, по клику открывается крупно
    if (q.image) {
      const img = document.createElement('img');
      img.className = 'q-img';
      img.src = q.image;
      img.alt = q.imageAlt || 'Иллюстрация к вопросу';
      img.loading = 'lazy';
      img.onclick = () => openLightbox(q.image);
      img.onerror = () => img.remove();   // нет файла — вопрос всё равно виден
      head.appendChild(img);
    }
    card.appendChild(head);

    q.answers.forEach((a, ai) => {
      const label = document.createElement('label');
      label.className = 'opt';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `q${i}`;
      input.value = ai;
      input.addEventListener('change', () => {
        if (examCompleted) return;
        userAnswers[i] = ai;
        updateProgress();
      });
      const span = document.createElement('span');
      span.textContent = clean(a);
      label.append(input, span);
      card.appendChild(label);
    });

    box.appendChild(card);
  });
  updateProgress();
}

/* ===== Проверка и результаты ===== */
function checkAnswers() {
  let score = 0;
  const results = currentQuestions.map((q, i) => {
    const correctIdx = q.answers.findIndex(isCorrectAnswer);
    const ok = userAnswers[i] === correctIdx;
    if (ok) score++;
    return {
      question: q.question,
      userAnswer: userAnswers[i] !== undefined ? clean(q.answers[userAnswers[i]]) : 'Не отвечено',
      correctAnswer: clean(q.answers[correctIdx]),
      ok
    };
  });
  const total = currentQuestions.length;
  return { score, total, results, passed: score >= passNeeded(total) };
}

function line(label, text) {           // безопасно: textContent, а не innerHTML
  const d = document.createElement('div');
  const b = document.createElement('b');
  b.textContent = label + ' ';
  d.append(b, text);
  return d;
}

function displayResults(r) {
  const box = $('results');
  box.innerHTML = '';

  const sc = document.createElement('div');
  sc.className = `card score ${r.passed ? 'pass' : 'fail'}`;
  sc.innerHTML = `<p class="big">${r.score} / ${r.total}</p>
    <h3>${r.passed ? '✅ Экзамен сдан успешно!' : '❌ Экзамен не сдан'}</h3>
    <p>Для сдачи нужно минимум ${passNeeded(r.total)} из ${r.total}.</p>`;
  const again = document.createElement('button');
  again.className = 'btn';
  again.textContent = 'Пересдать экзамен';
  again.onclick = backToStart;
  sc.appendChild(again);
  box.appendChild(sc);

  r.results.forEach((it, i) => {
    const d = document.createElement('div');
    d.className = `res ${it.ok ? 'ok' : 'no'}`;
    d.append(line(`Вопрос ${i + 1}:`, it.question),
             line('Ваш ответ:', it.userAnswer));
    if (!it.ok) d.append(line('Правильный ответ:', it.correctAnswer));
    box.appendChild(d);
  });

  box.classList.remove('hidden');
  box.scrollIntoView({ behavior: 'smooth' });
}

function submitQuiz() {
  if (examCompleted) return;
  examCompleted = true;
  document.querySelectorAll('#quiz-container input').forEach(i => i.disabled = true);
  $('submit-btn').classList.add('hidden');
  displayResults(checkAnswers());
}

function backToStart() {
  $('exam').classList.add('hidden');
  $('results').classList.add('hidden');
  $('start').classList.remove('hidden');
  window.scrollTo(0, 0);
}

/* ===== Увеличение картинки ===== */
function openLightbox(src) {
  $('lightbox').querySelector('img').src = src;
  $('lightbox').classList.remove('hidden');
}
$('lightbox').onclick = () => $('lightbox').classList.add('hidden');
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('lightbox').classList.add('hidden'); });

/* ===== Запуск ===== */
$('submit-btn').onclick = submitQuiz;
initStart();
