// ============================================================
//  pre-post-quiz.js  —  Add to every lesson page
//  (alongside topic-read-tracker.js, in the ~290 files under
//  ./pages/**/*.html)
//
//  <script src="/auth-config.js"></script>
//  <script src="/topic-read-tracker.js"></script>
//  <script src="/pre-post-quiz.js"></script>
//
//  ONE shared data file (prepost-quiz-data.json, in /pages/) holds
//  every topic's pre-quiz and post-quiz questions, keyed by topic.
//
//  This injects two buttons into the page's <header>: "Pre-Quiz"
//  and "Post-Quiz". The Post-Quiz button stays locked/disabled
//  until the Pre-Quiz has been completed - clicking Pre-Quiz opens
//  it, and finishing it unlocks Post-Quiz. Once both are done, a
//  before/after comparison is shown. Pages with no entry for their
//  key are completely unaffected - no buttons are injected.
//
//  To identify itself in the shared JSON, a page can either:
//    (a) set window.PPQ_TOPIC_KEY explicitly before this script
//        runs (recommended - no ambiguity, e.g.:
//          <script>window.PPQ_TOPIC_KEY = "Actuators/Classification_of_Actuators.html";</script>
//        ), or
//    (b) do nothing and let this script derive the key from the
//        page's own URL path (same convention mcq-data.json
//        already uses) - works but relies on the page living under
//        /pages/<Module>/<File>.html.
// ============================================================
(function () {
    const cfg = window.SIMTEL_AUTH_CONFIG;
    if (!cfg) { console.error('auth-config.js must load before pre-post-quiz.js'); return; }

    const DATA_URL_CANDIDATES = ['/pages/prepost-quiz-data.json', '../prepost-quiz-data.json', './prepost-quiz-data.json'];
    const NAVY = '#173681';
    const GOLD = '#e1ac3d';

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
            .ppq-header-btns {
                display: flex; align-items: center; gap: 10px;
                margin-left: auto; flex-shrink: 0; padding: 0 8px;
            }
            .ppq-header-btn {
                display: inline-flex; align-items: center; gap: 6px;
                padding: 8px 16px; border-radius: 20px; border: none;
                font-family: Georgia, 'Times New Roman', serif; font-size: 0.82rem; font-weight: 700;
                cursor: pointer; transition: all 0.2s; white-space: nowrap;
                background: ${NAVY}; color: #fff;
            }
            .ppq-header-btn:hover:not(:disabled) { background: #0e2461; transform: translateY(-1px); }
            .ppq-header-btn:disabled { background: #adb5bd; color: #f1f3f5; cursor: not-allowed; opacity: 0.75; }
            .ppq-header-btn.ppq-done { background: #28a745; }
            .ppq-header-btn.ppq-done:hover { background: #218838; }

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
            .ppq-btn-secondary { background: #e9ecef; color: #333; }
            .ppq-btn-secondary:hover { background: #dee2e6; }
            .ppq-progress { font-size: 0.8rem; color: #6c757d; margin-top: 4px; }
            .ppq-summary { text-align: center; padding: 10px 0 6px; }
            .ppq-summary .ppq-score-row { display: flex; justify-content: center; gap: 32px; margin: 18px 0; }
            .ppq-summary .ppq-score-box { text-align: center; }
            .ppq-summary .ppq-score-num { font-size: 2.2rem; font-weight: 900; color: ${NAVY}; }
            .ppq-summary .ppq-score-lbl { font-size: 0.78rem; color: #6c757d; text-transform: uppercase; letter-spacing: 0.05em; }
            .ppq-summary .ppq-arrow { font-size: 1.8rem; color: ${GOLD}; align-self: center; }
            .ppq-summary .ppq-verdict { font-size: 1rem; font-weight: 700; margin-top: 4px; }

            .ppq-toast {
                position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(20px);
                background: #212529; color: #fff; padding: 12px 20px; border-radius: 8px;
                font-family: Georgia, serif; font-size: 0.88rem; z-index: 999995;
                opacity: 0; transition: all 0.3s; pointer-events: none; max-width: 90vw; text-align: center;
            }
            .ppq-toast.ppq-show { opacity: 1; transform: translateX(-50%) translateY(0); }
        `;
        document.head.appendChild(style);
    }

    function showToast(message, ms = 3200) {
        let toast = document.querySelector('.ppq-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'ppq-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        requestAnimationFrame(() => toast.classList.add('ppq-show'));
        clearTimeout(toast._hideTimer);
        toast._hideTimer = setTimeout(() => toast.classList.remove('ppq-show'), ms);
    }

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
                    if (answers[qi] !== null && showFeedback) return;
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

    function showQuizModal({ title, subtitle, questions, showFeedback, onComplete, onCancel }) {
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
                    <button class="ppq-btn ppq-btn-secondary ppq-cancel-btn">Cancel</button>
                    <button class="ppq-btn ppq-btn-primary" disabled>Submit</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.documentElement.style.overflow = 'hidden';

        const progressEl = overlay.querySelector('.ppq-progress');
        const submitBtn = overlay.querySelector('.ppq-btn-primary');
        const cancelBtn = overlay.querySelector('.ppq-cancel-btn');
        const quizContainer = overlay.querySelector('.ppq-quiz-container');

        let latestAnswers = null;

        renderQuiz(quizContainer, questions, showFeedback, (answers, allAnswered) => {
            latestAnswers = answers;
            const answeredCount = answers.filter(a => a !== null).length;
            progressEl.textContent = `${answeredCount} of ${questions.length} answered`;
            submitBtn.disabled = !allAnswered;
        });

        function close() {
            document.documentElement.style.overflow = '';
            overlay.remove();
        }

        cancelBtn.addEventListener('click', () => {
            close();
            if (onCancel) onCancel();
        });

        submitBtn.addEventListener('click', () => {
            const score = scoreAnswers(questions, latestAnswers);
            close();
            onComplete(score, questions.length);
        });
    }

    function showComparisonSummary(preScore, preTotal, postScore, postTotal) {
        const prePct = Math.round((preScore / preTotal) * 100);
        const postPct = Math.round((postScore / postTotal) * 100);
        const verdict = postPct > prePct
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

    // ---- Header buttons ----
    function injectHeaderButtons(entry, topicKey) {
        const header = document.querySelector('header');
        if (!header) return null;

        const wrap = document.createElement('div');
        wrap.className = 'ppq-header-btns';

        const hasPre = entry.preQuestions?.length > 0;
        const hasPost = entry.postQuestions?.length > 0;

        if (hasPre) {
            wrap.innerHTML += `<button class="ppq-header-btn" id="ppq-btn-pre">📋 Pre-Quiz</button>`;
        }
        if (hasPost) {
            wrap.innerHTML += `<button class="ppq-header-btn" id="ppq-btn-post" disabled>✅ Post-Quiz</button>`;
        }

        header.style.display = header.style.display || 'flex';
        header.style.alignItems = header.style.alignItems || 'center';
        header.appendChild(wrap);

        return {
            preBtn: wrap.querySelector('#ppq-btn-pre'),
            postBtn: wrap.querySelector('#ppq-btn-post'),
        };
    }

    function setBtnDone(btn, label) {
        if (!btn) return;
        btn.classList.add('ppq-done');
        btn.textContent = label;
        btn.disabled = false;
    }

    document.addEventListener('DOMContentLoaded', async () => {
        let entry = null;
        let topicKey = window.PPQ_TOPIC_KEY || getRelativePagePath();

        const quizData = await loadQuizData();
        if (quizData) entry = quizData[topicKey] || null;

        if (!entry || (!entry.preQuestions?.length && !entry.postQuestions?.length)) return; // nothing configured for this topic - page behaves exactly as before

        injectBaseStyles();
        const buttons = injectHeaderButtons(entry, topicKey);
        if (!buttons) return;

        const { preBtn, postBtn } = buttons;
        const state = getState()[topicKey] || {};

        // Restore already-completed state on revisit
        if (state.preComplete && preBtn) setBtnDone(preBtn, '✓ Pre-Quiz');
        if (state.preComplete && postBtn) postBtn.disabled = false;
        if (state.postComplete && postBtn) setBtnDone(postBtn, '✓ Post-Quiz');

        if (preBtn) {
            preBtn.addEventListener('click', () => {
                const current = getState()[topicKey] || {};
                if (current.preComplete) {
                    showToast(`Pre-Quiz already completed — you scored ${current.preScore}/${current.preTotal}.`);
                    return;
                }
                showQuizModal({
                    title: '📋 Pre-Quiz',
                    subtitle: 'A quick baseline check before you start — there\'s no pass/fail here.',
                    questions: entry.preQuestions,
                    showFeedback: false,
                    onComplete: (score, total) => {
                        saveState(topicKey, { preComplete: true, preScore: score, preTotal: total });
                        saveScoreToServer(topicKey, 'pre', score, total);
                        setBtnDone(preBtn, '✓ Pre-Quiz');
                        if (postBtn) {
                            postBtn.disabled = false;
                            showToast('Pre-Quiz complete! Post-Quiz is now unlocked.');
                        }
                    }
                });
            });
        }

        if (postBtn) {
            postBtn.addEventListener('click', () => {
                if (postBtn.disabled) return; // locked until pre-quiz is done
                const current = getState()[topicKey] || {};
                if (current.postComplete) {
                    showToast(`Post-Quiz already completed — you scored ${current.postScore}/${current.postTotal}.`);
                    return;
                }
                showQuizModal({
                    title: '✅ Post-Quiz',
                    subtitle: 'Let\'s see what you picked up from this lesson.',
                    questions: entry.postQuestions,
                    showFeedback: true,
                    onComplete: (score, total) => {
                        const updated = saveState(topicKey, { postComplete: true, postScore: score, postTotal: total });
                        saveScoreToServer(topicKey, 'post', score, total);
                        setBtnDone(postBtn, '✓ Post-Quiz');
                        if (updated.preComplete) {
                            showComparisonSummary(updated.preScore, updated.preTotal, score, total);
                        }
                    }
                });
            });
        }

        // Gentle nudge (not a forced popup) once the reading dwell-timer
        // completes, if Post-Quiz is unlocked but not yet taken.
        if (postBtn) {
            window.addEventListener('simtel:topic-marked-read', () => {
                const current = getState()[topicKey] || {};
                if (!postBtn.disabled && !current.postComplete) {
                    showToast('Nice reading! The Post-Quiz is ready whenever you are.', 4000);
                }
            });
        }
    });
})();