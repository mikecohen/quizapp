const STORAGE_KEY = "myquiz.tests.v1";
const SAMPLE_QUIZ = {
  title: "Cell Biology Review",
  description: "A short practice set covering membranes, ATP, and organelles.",
  questions: [
    {
      prompt: "Which organelle is primarily responsible for producing ATP in eukaryotic cells?",
      options: ["Golgi apparatus", "Mitochondrion", "Ribosome", "Lysosome"],
      correctIndex: 1,
      explanation: "Mitochondria carry out cellular respiration, which produces most of the cell's ATP."
    },
    {
      prompt: "What is the main function of the cell membrane?",
      options: [
        "To store DNA",
        "To package proteins",
        "To control what enters and leaves the cell"
      ],
      correctIndex: 2,
      explanation: "The cell membrane is selectively permeable, so it regulates movement into and out of the cell."
    },
    {
      prompt: "Which macromolecule is the main component of cell membranes?",
      options: ["Phospholipids", "Nucleic acids", "Monosaccharides", "Triglycerides"],
      correctIndex: 0,
      explanation: "Cell membranes are built from a phospholipid bilayer with embedded proteins."
    }
  ]
};

const state = {
  tests: loadTests(),
  currentPage: "home",
  activeTestId: null,
  currentQuestionIndex: 0,
  selectedOptionIndex: null,
  submitted: false,
  currentAnswers: [],
  attemptRecorded: false
};

const homeView = document.getElementById("homeView");
const testsView = document.getElementById("testsView");
const setupView = document.getElementById("setupView");
const quizView = document.getElementById("quizView");
const navHomeButton = document.getElementById("navHomeButton");
const navTestsButton = document.getElementById("navTestsButton");
const homeNewTestButton = document.getElementById("homeNewTestButton");
const homeManageTestsButton = document.getElementById("homeManageTestsButton");
const testsNewButton = document.getElementById("testsNewButton");
const setupBackButton = document.getElementById("setupBackButton");
const quizBackButton = document.getElementById("quizBackButton");
const loadSampleButton = document.getElementById("loadSampleButton");
const clearInputButton = document.getElementById("clearInputButton");
const importForm = document.getElementById("importForm");
const quizFileInput = document.getElementById("quizFileInput");
const quizInput = document.getElementById("quizInput");
const importMessage = document.getElementById("importMessage");
const homeTestsEmpty = document.getElementById("homeTestsEmpty");
const homeTestsList = document.getElementById("homeTestsList");
const testsEmpty = document.getElementById("testsEmpty");
const testsList = document.getElementById("testsList");
const recentResultsEmpty = document.getElementById("recentResultsEmpty");
const recentResultsList = document.getElementById("recentResultsList");
const quizTitle = document.getElementById("quizTitle");
const quizMeta = document.getElementById("quizMeta");
const questionCard = document.getElementById("questionCard");
const correctCount = document.getElementById("correctCount");
const wrongCount = document.getElementById("wrongCount");
const remainingCount = document.getElementById("remainingCount");
const questionTemplate = document.getElementById("questionTemplate");

renderApp();
setPage("home");

navHomeButton.addEventListener("click", () => setPage("home"));
navTestsButton.addEventListener("click", () => setPage("tests"));
homeNewTestButton.addEventListener("click", openSetupForNewTest);
homeManageTestsButton.addEventListener("click", () => setPage("tests"));
testsNewButton.addEventListener("click", openSetupForNewTest);
setupBackButton.addEventListener("click", () => setPage("tests"));
quizBackButton.addEventListener("click", () => setPage("tests"));

loadSampleButton.addEventListener("click", () => {
  quizInput.value = JSON.stringify(SAMPLE_QUIZ, null, 2);
  quizFileInput.value = "";
  setImportMessage("Sample quiz loaded into the editor.", "success");
});

clearInputButton.addEventListener("click", () => {
  quizInput.value = "";
  quizFileInput.value = "";
  setImportMessage("", "");
});

quizFileInput.addEventListener("change", async (event) => {
  const [file] = event.target.files ?? [];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    JSON.parse(text);
    quizInput.value = text;
    setImportMessage(`Loaded "${file.name}". Review it below, then save the test.`, "success");
  } catch {
    quizFileInput.value = "";
    setImportMessage("That file could not be read as valid JSON.", "error");
  }
});

importForm.addEventListener("submit", (event) => {
  event.preventDefault();

  try {
    const savedTest = saveQuizFromText(quizInput.value);
    quizFileInput.value = "";
    setImportMessage(`Saved "${savedTest.title}".`, "success");
    renderApp();
    setPage("tests");
  } catch (error) {
    setImportMessage(error.message, "error");
  }
});

function openSetupForNewTest() {
  quizInput.value = "";
  quizFileInput.value = "";
  setImportMessage("", "");
  setPage("setup");
}

function loadTests() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistTests() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tests));
}

function saveQuizFromText(text) {
  const parsed = JSON.parse(text);
  const normalized = validateQuiz(parsed);
  const existing = state.tests.find((test) => test.slug === normalized.slug);
  const savedTest = {
    ...normalized,
    id: existing?.id ?? crypto.randomUUID(),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attempts: existing?.attempts ?? []
  };

  state.tests = [
    ...state.tests.filter((test) => test.id !== savedTest.id),
    savedTest
  ].sort((left, right) => left.title.localeCompare(right.title));

  persistTests();
  return savedTest;
}

function validateQuiz(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Quiz input must be a JSON object.");
  }

  const title = String(input.title ?? "").trim();
  if (!title) {
    throw new Error("Quiz title is required.");
  }

  if (!Array.isArray(input.questions) || input.questions.length === 0) {
    throw new Error("Quiz must include at least one question.");
  }

  const questions = input.questions.map((question, index) => {
    const prompt = String(question?.prompt ?? "").trim();
    const explanation = String(question?.explanation ?? "").trim();
    const options = Array.isArray(question?.options)
      ? question.options.map((option) => String(option).trim()).filter(Boolean)
      : [];
    const correctIndex = Number(question?.correctIndex);

    if (!prompt) {
      throw new Error(`Question ${index + 1} is missing a prompt.`);
    }
    if (options.length < 2) {
      throw new Error(`Question ${index + 1} must have at least two answer options.`);
    }
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      throw new Error(`Question ${index + 1} has an invalid correctIndex.`);
    }
    if (!explanation) {
      throw new Error(`Question ${index + 1} is missing an explanation.`);
    }

    return { prompt, options, correctIndex, explanation };
  });

  return {
    slug: slugify(title),
    title,
    description: String(input.description ?? "").trim(),
    questions
  };
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function setImportMessage(message, variant) {
  importMessage.textContent = message;
  importMessage.className = "status-message";
  if (variant) {
    importMessage.classList.add(variant);
  }
}

function setPage(page) {
  state.currentPage = page;
  homeView.classList.toggle("hidden", page !== "home");
  testsView.classList.toggle("hidden", page !== "tests");
  setupView.classList.toggle("hidden", page !== "setup");
  quizView.classList.toggle("hidden", page !== "quiz");
  navHomeButton.classList.toggle("active", page === "home");
  navTestsButton.classList.toggle("active", page === "tests");

  const target = (
    page === "home" ? homeView :
    page === "tests" ? testsView :
    page === "setup" ? setupView :
    quizView
  );
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderApp() {
  renderHomeTests();
  renderTestsPage();
  renderRecentResults();
}

function renderHomeTests() {
  homeTestsEmpty.classList.toggle("hidden", state.tests.length > 0);
  homeTestsList.innerHTML = "";

  getRecentTests(3).forEach((test) => {
    homeTestsList.appendChild(buildTestCard(test, "home"));
  });
}

function renderTestsPage() {
  testsEmpty.classList.toggle("hidden", state.tests.length > 0);
  testsList.innerHTML = "";

  state.tests.forEach((test) => {
    testsList.appendChild(buildTestCard(test, "tests"));
  });
}

function buildTestCard(test, context) {
  const latestAttempt = test.attempts.at(-1);
  const bestAttempt = test.attempts.reduce(
    (best, attempt) => (attempt.score > (best?.score ?? -1) ? attempt : best),
    null
  );

  const card = document.createElement("article");
  card.className = "test-card";
  card.innerHTML = `
    <div class="test-card-copy">
      <h3>${escapeHtml(test.title)}</h3>
      <p>${escapeHtml(test.description || "No description provided yet.")}</p>
    </div>
    <div class="test-stats">
      <span class="stat-pill">${test.questions.length} questions</span>
      <span class="stat-pill">${test.attempts.length} attempt${test.attempts.length === 1 ? "" : "s"}</span>
      <span class="stat-pill">Best: ${bestAttempt ? `${bestAttempt.score}%` : "N/A"}</span>
      <span class="stat-pill">Latest: ${latestAttempt ? `${latestAttempt.score}%` : "N/A"}</span>
    </div>
    <div class="inline-actions">
      <button class="primary-button" data-action="start" data-id="${test.id}" type="button">Start test</button>
      <button class="ghost-button" data-action="edit" data-id="${test.id}" type="button">Edit</button>
      ${context === "tests" ? `<button class="danger-button" data-action="delete" data-id="${test.id}" type="button">Delete</button>` : ""}
    </div>
  `;

  card.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", handleTestAction);
  });

  return card;
}

function renderRecentResults() {
  const attempts = state.tests
    .flatMap((test) => test.attempts.map((attempt) => ({ testTitle: test.title, attempt })))
    .sort((left, right) => new Date(right.attempt.completedAt) - new Date(left.attempt.completedAt))
    .slice(0, 5);

  recentResultsEmpty.classList.toggle("hidden", attempts.length > 0);
  recentResultsList.innerHTML = "";

  attempts.forEach(({ testTitle, attempt }) => {
    const item = document.createElement("article");
    item.className = "result-card";
    item.innerHTML = `
      <strong>${escapeHtml(testTitle)}</strong>
      <div class="result-row">
        <span>${attempt.score}%</span>
        <span>${attempt.correctCount}/${attempt.totalQuestions} correct</span>
      </div>
    `;
    recentResultsList.appendChild(item);
  });
}

function getRecentTests(limit) {
  return [...state.tests]
    .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))
    .slice(0, limit);
}

function handleTestAction(event) {
  const { action, id } = event.currentTarget.dataset;
  const test = state.tests.find((entry) => entry.id === id);
  if (!test) {
    return;
  }

  if (action === "start") {
    beginQuiz(test.id);
    return;
  }

  if (action === "edit") {
    quizInput.value = JSON.stringify(
      {
        title: test.title,
        description: test.description,
        questions: test.questions
      },
      null,
      2
    );
    quizFileInput.value = "";
    setImportMessage(`Loaded "${test.title}" into setup. Saving will update this test.`, "success");
    setPage("setup");
    return;
  }

  if (action === "delete") {
    state.tests = state.tests.filter((entry) => entry.id !== id);
    if (state.activeTestId === id) {
      state.activeTestId = null;
      questionCard.innerHTML = "";
    }
    persistTests();
    renderApp();
  }
}

function beginQuiz(testId) {
  state.activeTestId = testId;
  state.currentQuestionIndex = 0;
  state.selectedOptionIndex = null;
  state.submitted = false;
  state.currentAnswers = [];
  state.attemptRecorded = false;
  updateScoreboard();
  renderQuiz();
  setPage("quiz");
}

function renderQuiz() {
  const test = getActiveTest();
  if (!test) {
    setPage("tests");
    return;
  }

  updateScoreboard();
  const question = test.questions[state.currentQuestionIndex];
  quizTitle.textContent = test.title;
  quizMeta.textContent = test.description || `${test.questions.length} total questions`;

  if (!question) {
    renderSummary(test);
    return;
  }

  const fragment = questionTemplate.content.cloneNode(true);
  const shell = fragment.querySelector(".question-shell");
  const progress = fragment.querySelector(".question-progress");
  const prompt = fragment.querySelector(".question-prompt");
  const optionsList = fragment.querySelector(".options-list");
  const submitButton = fragment.querySelector(".submit-answer-button");
  const feedbackBlock = fragment.querySelector(".feedback-block");

  progress.textContent = `Question ${state.currentQuestionIndex + 1} of ${test.questions.length}`;
  prompt.textContent = question.prompt;

  question.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-button";
    button.textContent = option;
    button.addEventListener("click", () => {
      if (state.submitted) {
        return;
      }
      state.selectedOptionIndex = index;
      renderQuiz();
    });

    if (state.selectedOptionIndex === index) {
      button.classList.add("selected");
    }

    if (state.submitted) {
      if (index === question.correctIndex) {
        button.classList.add("correct");
      } else if (index === state.selectedOptionIndex) {
        button.classList.add("incorrect");
      }
    }

    optionsList.appendChild(button);
  });

  submitButton.textContent = state.submitted
    ? state.currentQuestionIndex === test.questions.length - 1
      ? "See results"
      : "Next question"
    : "Check answer";
  submitButton.disabled = !state.submitted && state.selectedOptionIndex === null;

  submitButton.addEventListener("click", () => {
    if (!state.submitted) {
      submitCurrentAnswer();
      return;
    }

    state.currentQuestionIndex += 1;
    state.selectedOptionIndex = null;
    state.submitted = false;
    renderQuiz();
  });

  if (state.submitted) {
    const wasCorrect = state.currentAnswers[state.currentQuestionIndex].isCorrect;
    feedbackBlock.classList.remove("hidden");
    feedbackBlock.classList.add(wasCorrect ? "correct" : "incorrect");
    feedbackBlock.innerHTML = wasCorrect
      ? "<strong>Correct.</strong> Nice work."
      : `<strong>Incorrect.</strong> ${escapeHtml(question.explanation)}`;
  }

  questionCard.innerHTML = "";
  questionCard.appendChild(shell);
}

function submitCurrentAnswer() {
  const test = getActiveTest();
  const question = test?.questions[state.currentQuestionIndex];
  if (!question || state.selectedOptionIndex === null) {
    return;
  }

  state.submitted = true;
  state.currentAnswers[state.currentQuestionIndex] = {
    selectedIndex: state.selectedOptionIndex,
    isCorrect: state.selectedOptionIndex === question.correctIndex
  };
  updateScoreboard();
  renderQuiz();
}

function updateScoreboard() {
  const test = getActiveTest();
  if (!test) {
    correctCount.textContent = "0";
    wrongCount.textContent = "0";
    remainingCount.textContent = "0";
    return;
  }

  const answered = state.currentAnswers.filter(Boolean);
  const right = answered.filter((answer) => answer.isCorrect).length;
  const wrong = answered.filter((answer) => !answer.isCorrect).length;
  const remaining = test.questions.length - answered.length;

  correctCount.textContent = String(right);
  wrongCount.textContent = String(wrong);
  remainingCount.textContent = String(remaining);
}

function renderSummary(test) {
  const correctAnswers = state.currentAnswers.filter((answer) => answer?.isCorrect).length;
  const wrongAnswers = state.currentAnswers.filter((answer) => answer && !answer.isCorrect).length;
  const score = Math.round((correctAnswers / test.questions.length) * 100);
  const attempt = {
    score,
    correctCount: correctAnswers,
    totalQuestions: test.questions.length,
    completedAt: new Date().toISOString()
  };

  const storedTest = state.tests.find((entry) => entry.id === test.id);
  if (!state.attemptRecorded && storedTest) {
    storedTest.attempts.push(attempt);
    state.attemptRecorded = true;
    persistTests();
    renderApp();
  }

  const summary = document.createElement("div");
  summary.className = "summary-card";
  summary.innerHTML = `
    <div class="summary-score">${score}%</div>
    <p>You answered ${correctAnswers} right and ${wrongAnswers} wrong out of ${test.questions.length} questions.</p>
    <div class="summary-list"></div>
    <div class="inline-actions">
      <button class="primary-button" type="button" id="restartQuizButton">Try again</button>
      <button class="ghost-button" type="button" id="summaryBackButton">Back to tests</button>
    </div>
  `;

  const summaryList = summary.querySelector(".summary-list");
  test.questions.forEach((question, index) => {
    const answer = state.currentAnswers[index];
    const item = document.createElement("div");
    item.className = "summary-item";
    item.innerHTML = `
      <strong>${escapeHtml(question.prompt)}</strong>
      <p>${answer?.isCorrect ? "Answered correctly." : `Review: ${escapeHtml(question.explanation)}`}</p>
    `;
    summaryList.appendChild(item);
  });

  summary.querySelector("#restartQuizButton").addEventListener("click", () => beginQuiz(test.id));
  summary.querySelector("#summaryBackButton").addEventListener("click", () => setPage("tests"));

  questionCard.innerHTML = "";
  questionCard.appendChild(summary);
}

function getActiveTest() {
  return state.tests.find((test) => test.id === state.activeTestId) ?? null;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
