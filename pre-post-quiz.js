// ============================================================
//  pre-post-quiz.js  —  Add to every lesson page
//  (alongside topic-read-tracker.js, in the ~290 files under
//  ./pages/**/*.html)
//
//  <script src="/auth-config.js"></script>
//  <script src="/topic-read-tracker.js"></script>
//  <script src="/pre-post-quiz.js"></script>
//
//  Rule: if this topic has quiz data in prepost-quiz-data.json,
//  a PRE-quiz gate blocks the lesson content until answered
//  (baseline check - just needs every question attempted, not
//  necessarily correct). Once the visitor finishes reading
//  (topic-read-tracker.js's dwell timer completes and fires
//  'simtel:topic-marked-read'), a POST-quiz appears, then a
//  before/after comparison. Pages with no entry in the JSON for
//  their path are completely unaffected - nothing is injected.
//
//  Fully self-contained: no HTML markup needs to be added to any
//  page, unlike the older mcq-handler.js pattern. Just the script
//  tag above.
// ============================================================
(function () {
    const cfg = window.SIMTEL_AUTH_CONFIG;
    if (!cfg) { console.error('auth-config.js must load before pre-post-quiz.js'); return; }

    const DATA_URL_CANDIDATES = ['/pages/prepost-quiz-data.json', '../prepost-quiz-data.json', './prepost-quiz-data.json'];
    const NAVY = '#173681';
    const GOLD = '#e1ac3d';

    // Same relative-path scheme mcq-data.json already uses (e.g.
    // "Actuators/Classification_of_Actuators.html") so both systems can
    // share one lookup key per topic without inventing a second convention.
    function getRelativePagePath() {
        const parts = window.location.pathname.split('/');
        const pagesIndex = parts.findIndex(p => p.toLowerCase() === 'pages');
        if (pagesIndex !== -1 && pagesIndex < parts.length - 1) {
            return decodeURIComponent(parts.slice(pagesIndex + 1).join('/'));
        }
        return decodeURIComponent(parts.slice(-2).join('/'));
    }

    async function loadQuizData() {
        for (const url of DATA_URL_CANDIDATES) {
            try {
                const res = await fetch(url);
                if (res.ok) return await res.json();
            } catch { /* try next candidate */ }
        }
        return null;
    }

    const LOCAL_KEY = 'simtel_prepost_quiz_state';

    function getState() {
        try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {}; }
        catch { return {}; }
    }

    function saveState(topicKey, patch) {
        const state = getState();
        state[topicKey] = Object.assign({}, state[topicKey], patch);
        try { localStorage.setItem(LOCAL_KEY, JSON.stringify(state)); } catch { /* storage full/unavailable - not critical */ }
        return state[topicKey];
    }

    // Best-effort save to the backend, in addition to the local record
    // above. Silently does nothing if the endpoint isn't set up yet -
    // never blocks the quiz flow on this.
    async function saveScoreToServer(topicId, phase, score, total) {
        const token = localStorage.getItem(cfg.TOKEN_KEY);
        if (!token) return;
        try {
            await fetch(`${cfg.AUTH_SERVER_URL}/api/quiz/save-score`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ topicId, phase, score, total })
            });
        } catch { /* endpoint may not exist yet - local record still saved */ }
    }

    function injectBaseStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .ppq-overlay {
                position: fixed; inset: 0; z-index: 999990;
                background: rgba(15, 23, 42, 0.72);
                display: flex; align-items: center; justify-content: center;
                padding: 24px;
                font-family: Georgia, 'Times New Roman', serif;
            }
            .ppq-card {
                background: #ffffff; border-radius: 14px;
                max-width: 640px; width: 100%; max-height: 88vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0,0,0,0.35);
            }
            .ppq-header {
                background: ${NAVY}; color: #fff;
                padding: 20px 26px; border-radius: 14px 14px 0 0;
            }
            .ppq-header h2 { margin: 0; font-size: 1.25rem; }
            .ppq-header p { margin: 6px 0 0; font-size: 0.85rem; opacity: 0.85; }
            .ppq-body { padding: 22px 26px; }
            .ppq-q { margin-bottom: 22px; }
            .ppq-q-text { font-weight: 700; margin-bottom: 10px; color: #212529; font-size: 1rem; }
            .ppq-opt {
                display: flex; align-items: center; gap: 10px;
                padding: 10px 14px; border: 2px solid #dee2e6; border-radius: 8px;
                margin-bottom: 8px; cursor: pointer; transition: all 0.2s;
            }
            .ppq-opt:hover { background: #f8f9fa; border-color: ${GOLD}; }
            .ppq-opt.ppq-selected { border-color: ${NAVY}; background: rgba(23,54,129,0.06); }
            .ppq-opt.ppq-correct { border-color: #28a745; background: #d4edda; }
            .ppq-opt.ppq-wrong { border-color: #dc3545; background: #f8d7da; }
            .ppq-opt input { cursor: pointer; }
            .ppq-opt label { cursor: pointer; flex: 1; font-size: 0.94rem; }
            .ppq-explain {
                margin-top: 8px; padding: 10px 12px; border-radius: 6px;
                font-size: 0.85rem; background: #f1f3f5; display: none;
            }
            .ppq-footer {
                padding: 16px 26px 22px; display: flex; justify-content: flex-end; gap: 10px;
                border-top: 1px solid #eee;
            }
            .ppq-btn {
                padding: 10px 22px; border-radius: 8px; border: none;
                font-weight: 700; cursor: pointer; font-family: inherit; font-size: 0.9rem;
            }
            .ppq-btn-primary { background: ${NAVY}; color: #fff; }
            .ppq-btn-primary:disabled { background: #adb5bd; cursor: not-allowed; }
            .ppq-btn-primary:not(:disabled):hover { background: #0e2461; }
            .ppq-progress { font-size: 0.8rem; color: #6c757d; margin-top: 4px; }
            .ppq-summary { text-align: center; padding: 10px 0 6px; }
            .ppq-summary .ppq-score-row { display: flex; justify-content: center; gap: 32px; margin: 18px 0; }
            .ppq-summary .ppq-score-box { text-align: center; }
            .ppq-summary .ppq-score-num { font-size: 2.2rem; font-weight: 900; color: ${NAVY}; }
            .ppq-summary .ppq-score-lbl { font-size: 0.78rem; color: #6c757d; text-transform: uppercase; letter-spacing: 0.05em; }
            .ppq-summary .ppq-arrow { font-size: 1.8rem; color: ${GOLD}; align-self: center; }
            .ppq-summary .ppq-verdict { font-size: 1rem; font-weight: 700; margin-top: 4px; }
        `;
        document.head.appendChild(style);
    }

    // Renders a quiz form into a container, calling onComplete(score, total)
    // once every question has been answered. showFeedback=true reveals
    // correct/incorrect styling and explanations as each question is
    // answered (used for the post-quiz); false keeps it neutral (used for
    // the pre-quiz, which is a baseline check, not a test to pass/fail).
    function renderQuiz(container, questions, showFeedback, onAllAnswered) {
        const answers = new Array(questions.length).fill(null);

        container.innerHTML = questions.map((q, qi) => `
            <div class="ppq-q" data-qi="${qi}">
                <div class="ppq-q-text">${qi + 1}. ${q.question}</div>
                <div class="ppq-opts">
                    ${q.options.map((opt, oi) => `
                        <div class="ppq-opt" data-oi="${oi}">
                            <input type="radio" name="ppq-q${qi}" id="ppq-q${qi}-o${oi}" value="${oi}">
                            <label for="ppq-q${qi}-o${oi}">${opt}</label>
                        </div>
                    `).join('')}
                </div>
                <div class="ppq-explain" data-qi="${qi}"></div>
            </div>
        `).join('');

        container.querySelectorAll('.ppq-q').forEach((qEl, qi) => {
            qEl.querySelectorAll('.ppq-opt').forEach((optEl, oi) => {
                optEl.addEventListener('click', () => {
                    if (answers[qi] !== null && showFeedback) return; // locked after first answer when feedback is shown
                    answers[qi] = oi;
                    qEl.querySelectorAll('input').forEach(r => r.checked = false);
                    qEl.querySelector(`#ppq-q${qi}-o${oi}`).checked = true;
                    qEl.querySelectorAll('.ppq-opt').forEach(e => e.classList.remove('ppq-selected', 'ppq-correct', 'ppq-wrong'));

                    if (showFeedback) {
                        const correct = questions[qi].correct;
                        optEl.classList.add(oi === correct ? 'ppq-correct' : 'ppq-wrong');
                        if (oi !== correct) {
                            qEl.querySelector(`.ppq-opt[data-oi="${correct}"]`).classList.add('ppq-correct');
                        }
                        const explainEl = qEl.querySelector('.ppq-explain');
                        if (questions[qi].explanation) {
                            explainEl.style.display = 'block';
                            explainEl.textContent = questions[qi].explanation;
                        }
                    } else {
                        optEl.classList.add('ppq-selected');
                    }

                    onAllAnswered(answers, answers.every(a => a !== null));
                });
            });
        });
    }

    function scoreAnswers(questions, answers) {
        let score = 0;
        questions.forEach((q, i) => { if (answers[i] === q.correct) score++; });
        return score;
    }

    function showQuizModal({ title, subtitle, questions, showFeedback, dismissible, onComplete }) {
        const overlay = document.createElement('div');
        overlay.className = 'ppq-overlay';
        overlay.innerHTML = `
            <div class="ppq-card">
                <div class="ppq-header">
                    <h2>${title}</h2>
                    <p>${subtitle}</p>
                </div>
                <div class="ppq-body">
                    <div class="ppq-quiz-container"></div>
                    <div class="ppq-progress">0 of ${questions.length} answered</div>
                </div>
                <div class="ppq-footer">
                    <button class="ppq-btn ppq-btn-primary" disabled>Continue</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.documentElement.style.overflow = 'hidden';

        const progressEl = overlay.querySelector('.ppq-progress');
        const continueBtn = overlay.querySelector('.ppq-btn-primary');
        const quizContainer = overlay.querySelector('.ppq-quiz-container');

        let latestAnswers = null;

        renderQuiz(quizContainer, questions, showFeedback, (answers, allAnswered) => {
            latestAnswers = answers;
            const answeredCount = answers.filter(a => a !== null).length;
            progressEl.textContent = `${answeredCount} of ${questions.length} answered`;
            continueBtn.disabled = !allAnswered;
        });

        continueBtn.addEventListener('click', () => {
            const score = scoreAnswers(questions, latestAnswers);
            document.documentElement.style.overflow = '';
            overlay.remove();
            onComplete(score, questions.length);
        });

        if (!dismissible) return; // pre-quiz: no escape/close - must complete it
    }

    function showComparisonSummary(preScore, preTotal, postScore, postTotal) {
        const prePct = Math.round((preScore / preTotal) * 100);
        const postPct = Math.round((postScore / postTotal) * 100);
        const improved = postPct > prePct;
        const verdict = improved
            ? `🎉 Great improvement — up ${postPct - prePct} points!`
            : postPct === prePct
                ? `You held steady at ${postPct}%.`
                : `Score dipped a little this time — consider a quick re-read.`;

        const overlay = document.createElement('div');
        overlay.className = 'ppq-overlay';
        overlay.innerHTML = `
            <div class="ppq-card" style="max-width: 480px;">
                <div class="ppq-header">
                    <h2>Quiz Results</h2>
                    <p>Before-and-after comparison for this topic</p>
                </div>
                <div class="ppq-body ppq-summary">
                    <div class="ppq-score-row">
                        <div class="ppq-score-box">
                            <div class="ppq-score-num">${preScore}/${preTotal}</div>
                            <div class="ppq-score-lbl">Pre-Quiz</div>
                        </div>
                        <div class="ppq-arrow">→</div>
                        <div class="ppq-score-box">
                            <div class="ppq-score-num">${postScore}/${postTotal}</div>
                            <div class="ppq-score-lbl">Post-Quiz</div>
                        </div>
                    </div>
                    <div class="ppq-verdict">${verdict}</div>
                </div>
                <div class="ppq-footer">
                    <button class="ppq-btn ppq-btn-primary">Done</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.documentElement.style.overflow = 'hidden';
        overlay.querySelector('.ppq-btn-primary').addEventListener('click', () => {
            document.documentElement.style.overflow = '';
            overlay.remove();
        });
    }

    function lockPageContent() {
        const wrapper = document.querySelector('.content-wrapper') || document.body;
        wrapper.style.filter = 'blur(6px)';
        wrapper.style.pointerEvents = 'none';
        wrapper.style.userSelect = 'none';
    }

    function unlockPageContent() {
        const wrapper = document.querySelector('.content-wrapper') || document.body;
        wrapper.style.filter = '';
        wrapper.style.pointerEvents = '';
        wrapper.style.userSelect = '';
    }

    document.addEventListener('DOMContentLoaded', async () => {
        const quizData = await loadQuizData();
        if (!quizData) return; // data file not present on this deployment yet - no-op

        const topicKey = getRelativePagePath();
        console.log('[pre-post-quiz] this page\'s key in prepost-quiz-data.json is:', JSON.stringify(topicKey));
        const entry = quizData[topicKey];
        if (!entry || (!entry.preQuestions?.length && !entry.postQuestions?.length)) return; // nothing configured for this topic - page behaves exactly as before

        injectBaseStyles();
        const state = getState()[topicKey] || {};

        // ---- PRE-QUIZ GATE ----
        if (entry.preQuestions?.length && !state.preComplete) {
            lockPageContent();
            showQuizModal({
                title: '📋 Quick Check-In',
                subtitle: 'Answer these before starting the lesson - this just measures your starting point, there\'s no pass/fail.',
                questions: entry.preQuestions,
                showFeedback: false,
                dismissible: false,
                onComplete: (score, total) => {
                    saveState(topicKey, { preComplete: true, preScore: score, preTotal: total });
                    saveScoreToServer(topicKey, 'pre', score, total);
                    unlockPageContent();
                }
            });
        }

        // ---- POST-QUIZ, triggered when topic-read-tracker.js confirms the
        // dwell timer completed (the existing "finished reading" signal) ----
        if (entry.postQuestions?.length) {
            window.addEventListener('simtel:topic-marked-read', () => {
                const current = getState()[topicKey] || {};
                if (current.postComplete) return; // already taken - don't show again on a reload of an already-read page

                showQuizModal({
                    title: '✅ Wrap-Up Quiz',
                    subtitle: 'Let\'s see what you picked up from this lesson.',
                    questions: entry.postQuestions,
                    showFeedback: true,
                    dismissible: false,
                    onComplete: (score, total) => {
                        const updated = saveState(topicKey, { postComplete: true, postScore: score, postTotal: total });
                        saveScoreToServer(topicKey, 'post', score, total);
                        if (updated.preComplete) {
                            showComparisonSummary(updated.preScore, updated.preTotal, score, total);
                        }
                    }
                });
            });
        }
    });
})();