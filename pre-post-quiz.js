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
//  every topic's pre-quiz and post-quiz questions, keyed by the
//  SAME "relative to /pages/" path index.html's mcq-data.json
//  already uses (e.g. "Actuators/Classification_of_Actuators.html").
//
//  This injects two buttons into the page's <header>: "Pre-Quiz"
//  and "Post-Quiz". The Post-Quiz button stays locked/disabled
//  until the Pre-Quiz has been completed - clicking Pre-Quiz opens
//  it, and finishing it unlocks Post-Quiz. Once both are done, a
//  before/after comparison is shown. Pages with no entry for their
//  key are completely unaffected - no buttons are injected.
//
//  RETAKING: clicking a completed quiz's button re-opens it for
//  another attempt - the new score overwrites the saved one (and
//  re-locks Post-Quiz if Pre-Quiz is retaken, matching the normal
//  "post needs a completed pre" rule).
//
//  To identify itself in the shared JSON, a page can either:
//    (a) do nothing and let this script derive the key from the
//        page's own URL path - this is the default and matches
//        mcq-data.json's convention automatically as long as the
//        page lives under /pages/<Module>/<File>.html (true for
//        every standard lesson page), or
//    (b) set window.PPQ_TOPIC_KEY explicitly before this script
//        runs, ONLY for a page that doesn't live at a standard
//        /pages/<Module>/<File>.html location - and it must still
//        use the exact same "<Module>/<File>.html" format as (a)
//        would have produced, so index.html's own lookup (which
//        always uses that format) can find it too.
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
                margin-left: auto; flex-shrink: 0; padding: 0 8px; margin-right: 90px;
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

            /* Final review slide - all questions, with right/wrong, shown
               after the last question is answered and before finishing. */
            .ppq-review-score {
                text-align: center; font-size: 1.15rem; font-weight: 800;
                color: ${NAVY}; margin-bottom: 18px; padding-bottom: 14px;
                border-bottom: 1px solid #eee;
            }
            .ppq-review-item {
                padding: 12px 14px; border-radius: 8px; margin-bottom: 12px;
                border-left: 4px solid #dee2e6; background: #f8f9fa;
            }
            .ppq-review-item.ppq-review-right { border-left-color: #28a745; background: #f1faf3; }
            .ppq-review-item.ppq-review-wrong { border-left-color: #dc3545; background: #fdf3f4; }
            .ppq-review-q { font-weight: 700; font-size: 0.92rem; color: #212529; margin-bottom: 6px; display: flex; gap: 8px; }
            .ppq-review-badge {
                flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%;
                display: inline-flex; align-items: center; justify-content: center;
                font-size: 0.72rem; font-weight: 900; color: #fff;
            }
            .ppq-review-right .ppq-review-badge { background: #28a745; }
            .ppq-review-wrong .ppq-review-badge { background: #dc3545; }
            .ppq-review-ans { font-size: 0.85rem; color: #495057; margin-left: 28px; }
            .ppq-review-correct-ans { color: #198754; }
            .ppq-review-exp { font-size: 0.8rem; color: #6c757d; margin: 6px 0 0 28px; font-style: italic; }

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

            /* "Result" button - lives in the header next to Pre/Post-Quiz.
               Hidden until at least one quiz has been completed; opens
               the scores as a popup. */
            .ppq-results-trigger { display: none; background: ${GOLD}; color: ${NAVY}; }
            .ppq-results-trigger:hover:not(:disabled) { background: #cb9c35; }
            .ppq-results-trigger.ppq-visible { display: inline-flex; }
            .ppq-results-row { display: flex; gap: 28px; flex-wrap: wrap; align-items: center; margin-top: 4px; }
            .ppq-results-item { display: flex; align-items: center; gap: 8px; }
            .ppq-results-label { font-size: 0.86rem; color: #495057; font-weight: 600; }
            .ppq-results-score {
                font-size: 1.05rem; font-weight: 800; color: ${NAVY};
                background: rgba(23,54,129,0.07); padding: 2px 12px; border-radius: 20px;
            }
            .ppq-results-pending { font-size: 0.86rem; color: #adb5bd; font-style: italic; }
            .ppq-results-retake {
                background: none; border: 1px solid #dee2e6; color: #495057;
                padding: 4px 12px; border-radius: 20px; font-size: 0.76rem;
                cursor: pointer; font-family: inherit; font-weight: 600;
                transition: all 0.15s;
            }
            .ppq-results-retake:hover { background: #f1f3f5; border-color: ${NAVY}; color: ${NAVY}; }
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

    function scoreAnswers(questions, answers) {
        let score = 0;
        questions.forEach((q, i) => { if (answers[i] === q.correct) score++; });
        return score;
    }

    // One question shown at a time, with Previous/Next navigation - not
    // all questions stacked in one scroll. onStateChange fires after every
    // answer/navigation so the caller can update the footer's Next/Submit
    // button and progress label.
    function renderQuizStep(container, questions, showFeedback, state, onStateChange) {
        const qi = state.current;
        const q = questions[qi];
        const selected = state.answers[qi];

        container.innerHTML = `
            <div class="ppq-q">
                <div class="ppq-q-text">${qi + 1}. ${q.question}</div>
                <div class="ppq-opts">
                    ${q.options.map((opt, oi) => `
                        <div class="ppq-opt" data-oi="${oi}">
                            <input type="radio" name="ppq-q" id="ppq-o${oi}" value="${oi}">
                            <label for="ppq-o${oi}">${opt}</label>
                        </div>
                    `).join('')}
                </div>
                <div class="ppq-explain"></div>
            </div>
        `;

        const qEl = container.querySelector('.ppq-q');
        const explainEl = qEl.querySelector('.ppq-explain');

        function paintAnswered(oi) {
            qEl.querySelectorAll('input').forEach(r => r.checked = false);
            qEl.querySelector(`#ppq-o${oi}`).checked = true;
            qEl.querySelectorAll('.ppq-opt').forEach(e => e.classList.remove('ppq-selected', 'ppq-correct', 'ppq-wrong'));
            const optEl = qEl.querySelector(`.ppq-opt[data-oi="${oi}"]`);
            if (showFeedback) {
                const correct = q.correct;
                optEl.classList.add(oi === correct ? 'ppq-correct' : 'ppq-wrong');
                if (oi !== correct) {
                    qEl.querySelector(`.ppq-opt[data-oi="${correct}"]`).classList.add('ppq-correct');
                }
                if (q.explanation) {
                    explainEl.style.display = 'block';
                    explainEl.textContent = q.explanation;
                }
            } else {
                optEl.classList.add('ppq-selected');
            }
        }

        if (selected !== null && selected !== undefined) paintAnswered(selected);

        qEl.querySelectorAll('.ppq-opt').forEach((optEl, oi) => {
            optEl.addEventListener('click', () => {
                // Read the live answer from state (not the stale "selected"
                // closure captured when this step first rendered) so the
                // lock actually holds after the first click, in feedback mode.
                if (state.answers[qi] !== null && showFeedback) return;
                state.answers[qi] = oi;
                paintAnswered(oi);
                onStateChange();
            });
        });
    }

    // Final review slide, shown after the last question's "Submit" -
    // lists every question with the user's answer, the correct answer,
    // and a right/wrong badge, before the attempt is actually finished.
    function renderReviewSlide(container, questions, answers) {
        const score = scoreAnswers(questions, answers);
        container.innerHTML = `
            <div class="ppq-review">
                <div class="ppq-review-score">You scored <strong>${score}/${questions.length}</strong></div>
                ${questions.map((q, qi) => {
                    const userAns = answers[qi];
                    const isRight = userAns === q.correct;
                    return `
                        <div class="ppq-review-item ${isRight ? 'ppq-review-right' : 'ppq-review-wrong'}">
                            <div class="ppq-review-q">
                                <span class="ppq-review-badge">${isRight ? '✓' : '✗'}</span>
                                ${qi + 1}. ${q.question}
                            </div>
                            <div class="ppq-review-ans">Your answer: <strong>${q.options[userAns]}</strong></div>
                            ${!isRight ? `<div class="ppq-review-ans ppq-review-correct-ans">Correct answer: <strong>${q.options[q.correct]}</strong></div>` : ''}
                            ${q.explanation ? `<div class="ppq-review-exp">${q.explanation}</div>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
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
                    <div class="ppq-progress">Question 1 of ${questions.length}</div>
                </div>
                <div class="ppq-footer">
                    <button class="ppq-btn ppq-btn-secondary ppq-cancel-btn">Cancel</button>
                    <button class="ppq-btn ppq-btn-secondary ppq-prev-btn" style="display:none;">◀ Previous</button>
                    <button class="ppq-btn ppq-btn-primary ppq-next-btn" disabled>Next ▶</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.documentElement.style.overflow = 'hidden';

        const progressEl = overlay.querySelector('.ppq-progress');
        const nextBtn = overlay.querySelector('.ppq-next-btn');
        const prevBtn = overlay.querySelector('.ppq-prev-btn');
        const cancelBtn = overlay.querySelector('.ppq-cancel-btn');
        const quizContainer = overlay.querySelector('.ppq-quiz-container');

        const state = { current: 0, answers: new Array(questions.length).fill(null), onReview: false };
        const isLast = () => state.current === questions.length - 1;

        function refreshFooter() {
            if (state.onReview) {
                progressEl.textContent = 'Review your answers';
                prevBtn.style.display = 'inline-block';
                prevBtn.textContent = '◀ Back to Questions';
                nextBtn.textContent = 'Finish';
                nextBtn.disabled = false;
                return;
            }
            const answered = state.answers[state.current] !== null;
            progressEl.textContent = `Question ${state.current + 1} of ${questions.length}`;
            prevBtn.style.display = state.current > 0 ? 'inline-block' : 'none';
            prevBtn.textContent = '◀ Previous';
            nextBtn.textContent = isLast() ? 'Review Answers' : 'Next ▶';
            nextBtn.disabled = !answered;
        }

        function showStep() {
            if (state.onReview) {
                renderReviewSlide(quizContainer, questions, state.answers);
            } else {
                renderQuizStep(quizContainer, questions, showFeedback, state, () => {
                    nextBtn.disabled = false;
                });
            }
            refreshFooter();
        }

        showStep();

        function close() {
            document.documentElement.style.overflow = '';
            overlay.remove();
        }

        cancelBtn.addEventListener('click', () => {
            close();
            if (onCancel) onCancel();
        });

        prevBtn.addEventListener('click', () => {
            if (state.onReview) {
                state.onReview = false;
                showStep();
            } else if (state.current > 0) {
                state.current -= 1;
                showStep();
            }
        });

        nextBtn.addEventListener('click', () => {
            if (state.onReview) {
                const score = scoreAnswers(questions, state.answers);
                close();
                onComplete(score, questions.length);
                return;
            }
            if (!isLast()) {
                state.current += 1;
                showStep();
                return;
            }
            state.onReview = true;
            showStep();
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
    function injectHeaderButtons(entry) {
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
        wrap.innerHTML += `<button class="ppq-header-btn ppq-results-trigger" id="ppq-results-trigger" type="button">📊 Result</button>`;

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

    function setBtnUndone(btn, label) {
        if (!btn) return;
        btn.classList.remove('ppq-done');
        btn.textContent = label;
    }

    // ---- Results trigger (small pill) + popup, instead of an always-on
    // inline panel taking up page space. The pill only appears once at
    // least one quiz has been completed; clicking it opens the results
    // as a popup. ----
    function injectResultsPanel() {
        // The Result button is created in injectHeaderButtons (header).
        return document.getElementById('ppq-results-trigger');
    }

    function buildResultsRowHtml(hasPre, hasPost, state) {
        let html = '';
        if (hasPre) {
            html += state.preComplete
                ? `<div class="ppq-results-item">
                     <span class="ppq-results-label">Pre-Quiz:</span>
                     <span class="ppq-results-score">${state.preScore}/${state.preTotal}</span>
                     <button type="button" class="ppq-results-retake" id="ppq-retake-pre">↺ Retake</button>
                   </div>`
                : `<div class="ppq-results-item"><span class="ppq-results-pending">Pre-Quiz not taken yet</span></div>`;
        }
        if (hasPost) {
            html += state.postComplete
                ? `<div class="ppq-results-item">
                     <span class="ppq-results-label">Post-Quiz:</span>
                     <span class="ppq-results-score">${state.postScore}/${state.postTotal}</span>
                     <button type="button" class="ppq-results-retake" id="ppq-retake-post">↺ Retake</button>
                   </div>`
                : `<div class="ppq-results-item"><span class="ppq-results-pending">${state.preComplete ? 'Post-Quiz not taken yet' : 'Complete Pre-Quiz to unlock'}</span></div>`;
        }
        return html;
    }

    function openResultsPopup(hasPre, hasPost, state, onRetakePre, onRetakePost) {
        const overlay = document.createElement('div');
        overlay.className = 'ppq-overlay';
        overlay.innerHTML = `
            <div class="ppq-card" style="max-width: 480px;">
                <div class="ppq-header">
                    <h2>📊 Your Quiz Results</h2>
                    <p>This page's pre-quiz and post-quiz scores</p>
                </div>
                <div class="ppq-body">
                    <div class="ppq-results-row" id="ppq-results-row-popup">${buildResultsRowHtml(hasPre, hasPost, state)}</div>
                </div>
                <div class="ppq-footer">
                    <button class="ppq-btn ppq-btn-primary">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.documentElement.style.overflow = 'hidden';

        function close() {
            document.documentElement.style.overflow = '';
            overlay.remove();
        }
        overlay.querySelector('.ppq-btn-primary').addEventListener('click', close);

        const retakePreBtn = overlay.querySelector('#ppq-retake-pre');
        if (retakePreBtn) retakePreBtn.addEventListener('click', () => { close(); onRetakePre(); });
        const retakePostBtn = overlay.querySelector('#ppq-retake-post');
        if (retakePostBtn) retakePostBtn.addEventListener('click', () => { close(); onRetakePost(); });
    }

    function updateResultsPanel(hasPre, hasPost, state, onRetakePre, onRetakePost) {
        const trigger = document.getElementById('ppq-results-trigger');
        if (!trigger) return;

        const anyComplete = !!(state.preComplete || state.postComplete);
        trigger.classList.toggle('ppq-visible', anyComplete);
        if (!anyComplete) return;

        // Re-bind on every update (state is already the freshly-read value
        // from this call) so the popup always opens with the latest scores,
        // even after a retake changes them.
        trigger.onclick = () => openResultsPopup(hasPre, hasPost, state, onRetakePre, onRetakePost);
    }

    document.addEventListener('DOMContentLoaded', async () => {
        let entry = null;
        // Standard pages: always auto-derive (matches mcq-data.json/index.html's
        // convention automatically). window.PPQ_TOPIC_KEY is only for pages
        // living outside the normal /pages/<Module>/<File>.html structure.
        let topicKey = window.PPQ_TOPIC_KEY || getRelativePagePath();

        const quizData = await loadQuizData();
        if (quizData) entry = quizData[topicKey] || null;

        if (!entry || (!entry.preQuestions?.length && !entry.postQuestions?.length)) return; // nothing configured for this topic - page behaves exactly as before

        injectBaseStyles();
        const buttons = injectHeaderButtons(entry);
        if (!buttons) return;

        const { preBtn, postBtn } = buttons;
        const hasPre = entry.preQuestions?.length > 0;
        const hasPost = entry.postQuestions?.length > 0;
        injectResultsPanel(hasPre, hasPost);

        function refreshPanel() {
            updateResultsPanel(hasPre, hasPost, getState()[topicKey] || {}, openPreQuiz, openPostQuiz);
        }

        const state = getState()[topicKey] || {};

        // Restore already-completed state on revisit
        if (state.preComplete && preBtn) setBtnDone(preBtn, `✓ Pre-Quiz (${state.preScore}/${state.preTotal})`);
        if (state.preComplete && postBtn) postBtn.disabled = false;
        if (state.postComplete && postBtn) setBtnDone(postBtn, `✓ Post-Quiz (${state.postScore}/${state.postTotal})`);
        refreshPanel();

        function openPreQuiz() {
            showQuizModal({
                title: '📋 Pre-Quiz',
                subtitle: 'A quick baseline check before you start.',
                questions: entry.preQuestions,
                showFeedback: true,
                onComplete: (score, total) => {
                    const wasAlreadyComplete = !!getState()[topicKey]?.preComplete;
                    // Retaking the pre-quiz re-locks post-quiz and clears its
                    // old score, since "post" is meant to follow a *fresh* pre.
                    saveState(topicKey, { preComplete: true, preScore: score, preTotal: total, postComplete: false, postScore: undefined, postTotal: undefined });
                    saveScoreToServer(topicKey, 'pre', score, total);
                    setBtnDone(preBtn, `✓ Pre-Quiz (${score}/${total})`);
                    if (postBtn) {
                        postBtn.disabled = false;
                        setBtnUndone(postBtn, '✅ Post-Quiz');
                        showToast(wasAlreadyComplete
                            ? `Pre-Quiz retaken — new score ${score}/${total}. Post-Quiz is ready for another attempt too.`
                            : 'Pre-Quiz complete! Post-Quiz is now unlocked.');
                    }
                    refreshPanel();
                }
            });
        }

        function openPostQuiz() {
            showQuizModal({
                title: '✅ Post-Quiz',
                subtitle: 'Let\'s see what you picked up from this lesson.',
                questions: entry.postQuestions,
                showFeedback: true,
                onComplete: (score, total) => {
                    const updated = saveState(topicKey, { postComplete: true, postScore: score, postTotal: total });
                    saveScoreToServer(topicKey, 'post', score, total);
                    setBtnDone(postBtn, `✓ Post-Quiz (${score}/${total})`);
                    refreshPanel();
                    if (updated.preComplete) {
                        showComparisonSummary(updated.preScore, updated.preTotal, score, total);
                    }
                }
            });
        }

        // Clicking a completed quiz's button (in the header OR the results
        // panel's "Retake" button) retakes it - overwrites the saved score
        // rather than just showing the old result. Both entry points share
        // the exact same openPreQuiz/openPostQuiz functions, so behavior is
        // identical either way, and the panel always reflects the latest attempt.
        if (preBtn) preBtn.addEventListener('click', openPreQuiz);
        if (postBtn) {
            postBtn.addEventListener('click', () => {
                if (postBtn.disabled) return; // locked until pre-quiz is done
                openPostQuiz();
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