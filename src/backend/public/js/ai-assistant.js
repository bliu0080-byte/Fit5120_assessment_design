/**
 * AI Assistant page script
 * Provides chat simulation and tutorial overlay.
 */

(function () {
    const TOUR_STEPS = [
        {
            title: 'Welcome to the Safety Assistant',
            description: 'This area introduces the assistant. Use the buttons here to replay the walkthrough at any time.',
            target: 'assistant-header'
        },
        {
            title: 'Ask Questions Anytime',
            description: 'Type a question here and press send. Try “Is this safe?” or “Guide me through reporting a scam.”',
            target: 'input-area'
        },
        {
            title: 'Explore the Helper Cards',
            description: 'Use these cards for quick tutorials, helpful tips, and background information whenever you need them.',
            target: 'features'
        }
    ];

    function createId() {
        if (window.crypto?.randomUUID) {
            return crypto.randomUUID();
        }
        return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }

    function resolveApiBase() {
        const cfg = window.SCAMSAFE_CONFIG || window.CONFIG || {};
        if (cfg.apiBackend?.baseUrl) {
            return cfg.apiBackend.baseUrl.replace(/\/$/, '');
        }
        if (location.hostname.endsWith('github.io')) {
            return 'https://scamsafe.onrender.com/api';
        }
        if (location.hostname.endsWith('onrender.com')) {
            return `${location.origin}/api`;
        }
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            const port = location.port || '';
            if (port && port !== '3000') {
                return `http://${location.hostname}:3001/api`;
            }
            return `${location.origin}/api`;
        }
        return `${location.origin}/api`;
    }

    const MAX_MESSAGE_LENGTH = 900;
    const MAX_TURNS = 12; // keep latest 12 question/answer pairs

    document.addEventListener('DOMContentLoaded', () => {
        const API_BASE = resolveApiBase();
        const CHAT_ENDPOINT = `${API_BASE.replace(/\/$/, '')}/assistant/chat`;

        const messageContainer = document.getElementById('assistantMessages');
        const input = document.getElementById('assistantInput');
        const sendButton = document.getElementById('assistantSend');
        const toast = document.getElementById('assistantToast');
        const tour = document.getElementById('assistantTour');
        const tourNext = document.getElementById('tourNext');
        const tourSkipPrimary = document.getElementById('tourSkip');
        const tourSkipSecondary = document.getElementById('tourSkipSecondary');
        const tourStepNumber = document.getElementById('tourStepNumber');
        const tourTitle = document.getElementById('tourTitle');
        const tourDescription = document.getElementById('tourDescription');
        const tourDots = document.getElementById('tourDots');
        const startTourButtons = document.querySelectorAll('[data-start-tour]');

        const initialGreeting = 'Hello! I\'m here to help you stay safe online and learn how to use the ScamSafe website. Ask anything and I\'ll guide you.';
        let messages = [{
            id: createId(),
            type: 'assistant',
            content: initialGreeting
        }];
        const conversationHistory = [{
            role: 'assistant',
            content: initialGreeting
        }];

        let toastTimer = null;
        let tourIndex = 0;
        let highlightedElement = null;
        let isSending = false;

        function renderMessages() {
            if (!messageContainer) return;
            messageContainer.innerHTML = '';

            messages.forEach((message) => {
                const row = document.createElement('div');
                row.className = `assistant-message assistant-message--${message.type === 'user' ? 'user' : 'assistant'}`;

                const bubble = document.createElement('div');
                bubble.className = 'assistant-message__bubble';
                if (message.pending) {
                    bubble.classList.add('assistant-message__bubble--pending');
                }

                if (message.isSafety) {
                    const label = document.createElement('div');
                    label.className = 'assistant-message__label';
                    const icon = document.createElement('i');
                    icon.className = 'fa-solid fa-triangle-exclamation';
                    const text = document.createElement('span');
                    text.textContent = 'Safety tips';
                    label.append(icon, text);
                    bubble.appendChild(label);
                }

                const body = document.createElement('p');
                body.textContent = message.content;
                bubble.appendChild(body);

                if (Array.isArray(message.steps) && message.steps.length) {
                    const stepsWrapper = document.createElement('div');
                    stepsWrapper.className = 'assistant-message__steps';
                    message.steps.forEach((step, index) => {
                        const stepRow = document.createElement('div');
                        stepRow.className = 'assistant-step';

                        const stepIndex = document.createElement('div');
                        stepIndex.className = 'assistant-step__index';
                        stepIndex.textContent = String(index + 1);

                        const stepText = document.createElement('p');
                        stepText.textContent = step;

                        stepRow.append(stepIndex, stepText);
                        stepsWrapper.appendChild(stepRow);
                    });
                    bubble.appendChild(stepsWrapper);
                }

                row.appendChild(bubble);
                messageContainer.appendChild(row);
            });

            messageContainer.scrollTo({
                top: messageContainer.scrollHeight,
                behavior: 'smooth'
            });
        }

        function addMessage(message) {
            const id = message.id || createId();
            messages = [...messages, { ...message, id }];
            renderMessages();
            return id;
        }

        function updateMessage(id, patch) {
            let dirty = false;
            messages = messages.map((msg) => {
                if (msg.id !== id) return msg;
                dirty = true;
                return { ...msg, ...patch };
            });
            if (dirty) renderMessages();
        }

        async function requestAssistantReply() {
            const res = await fetch(CHAT_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: conversationHistory })
            });

            let payload = null;
            try {
                payload = await res.json();
            } catch (e) {
                // ignore JSON parse errors; handled below
            }

            if (!res.ok) {
                const reason = payload?.error || `Assistant error (HTTP ${res.status})`;
                throw new Error(reason);
            }

            if (!payload?.reply) {
                throw new Error(payload?.error || 'Assistant returned an empty reply.');
            }

            return {
                text: String(payload.reply),
                model: payload.modelUsed || payload.model || 'unknown',
                fallbackUsed: Boolean(payload.fallback)
            };
        }

        function setSendingState(active) {
            isSending = active;
            if (sendButton) {
                sendButton.disabled = active;
                sendButton.setAttribute('aria-busy', active ? 'true' : 'false');
            }
            if (input) {
                input.setAttribute('aria-busy', active ? 'true' : 'false');
            }
        }

        async function handleSend() {
            if (!input || isSending) return;
            const text = input.value.trim();
            if (!text) return;

            if (text.length > MAX_MESSAGE_LENGTH) {
                showToast(`Let's keep questions under about ${MAX_MESSAGE_LENGTH} characters. Try shortening it or split it into smaller parts.`);
                return;
            }

            setSendingState(true);

            addMessage({ type: 'user', content: text });
            conversationHistory.push({ role: 'user', content: text });
            if (conversationHistory.length > MAX_TURNS * 2 + 1) {
                const keep = conversationHistory.slice(-MAX_TURNS * 2);
                conversationHistory.length = 1; // keep system/initial assistant
                conversationHistory.push(...keep);
            }

            const pendingId = addMessage({
                type: 'assistant',
                content: 'Thinking…',
                pending: true
            });

            input.value = '';
            input.focus();

            try {
                const reply = await requestAssistantReply();
                updateMessage(pendingId, {
                    content: reply.text + (reply.fallbackUsed ? '\n\n(Using backup model for this answer.)' : ''),
                    pending: false
                });
                conversationHistory.push({ role: 'assistant', content: reply.text });
            } catch (error) {
                console.error('Assistant request failed:', error);
                conversationHistory.pop(); // remove the user turn to keep history clean
                updateMessage(pendingId, {
                    content: 'Sorry, I’m having trouble reaching the assistant right now. Please try again shortly.',
                    pending: false
                });
                showToast(error.message || 'Assistant unavailable right now.');
            } finally {
                setSendingState(false);
            }
        }

        function showToast(message) {
            if (!toast) return;
            toast.textContent = message;
            toast.classList.add('is-visible');
            if (toastTimer) clearTimeout(toastTimer);
            toastTimer = window.setTimeout(() => {
                toast.classList.remove('is-visible');
            }, 3200);
        }

        function highlightTarget(step) {
            if (highlightedElement) {
                highlightedElement.classList.remove('assistant-highlight');
            }
            highlightedElement = null;

            if (!step?.target) return;
            highlightedElement = document.getElementById(step.target);
            if (highlightedElement) {
                highlightedElement.classList.add('assistant-highlight');
                highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        function positionTourCard() {
            if (!tour) return;
            const card = tour.querySelector('.assistant-tour__card');
            if (!card) return;
            const backdrop = tour.querySelector('.assistant-tour__backdrop');

            let align = 'center';
            let vertical = 'bottom';

            if (highlightedElement) {
                const rect = highlightedElement.getBoundingClientRect();
                const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
                const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                if (backdrop) {
                    const radius = Math.max(rect.width, rect.height) / 2 + 48;
                    const fade = radius + 120;
                    backdrop.style.setProperty('--hole-x', `${centerX}px`);
                    backdrop.style.setProperty('--hole-y', `${centerY}px`);
                    backdrop.style.setProperty('--hole-radius', `${radius}px`);
                    backdrop.style.setProperty('--hole-fade', `${fade}px`);
                }

                if (centerX < viewportWidth * 0.35) align = 'right';
                else if (centerX > viewportWidth * 0.65) align = 'left';
                else align = 'center';

                if (centerY > viewportHeight * 0.65) vertical = 'top';
                else if (centerY < viewportHeight * 0.35) vertical = 'bottom';
                else vertical = 'middle';
            } else if (backdrop) {
                backdrop.style.removeProperty('--hole-x');
                backdrop.style.removeProperty('--hole-y');
                backdrop.style.removeProperty('--hole-radius');
                backdrop.style.removeProperty('--hole-fade');
            }

            tour.dataset.align = align;
            tour.dataset.vertical = vertical;
        }

        function updateTourUI() {
            const step = TOUR_STEPS[tourIndex];
            if (!step) return;

            if (tourStepNumber) tourStepNumber.textContent = String(tourIndex + 1);
            if (tourTitle) tourTitle.textContent = step.title;
            if (tourDescription) tourDescription.textContent = step.description;

            if (tourDots) {
                tourDots.innerHTML = '';
                TOUR_STEPS.forEach((_, idx) => {
                    const dot = document.createElement('span');
                    dot.className = 'assistant-tour__dot' + (idx === tourIndex ? ' is-active' : '');
                    tourDots.appendChild(dot);
                });
            }

            if (tourNext) {
                const label = tourNext.querySelector('span');
                if (label) {
                    label.textContent = tourIndex === TOUR_STEPS.length - 1 ? 'Finish' : 'Next';
                }
                const icon = tourNext.querySelector('i');
                if (icon) {
                    icon.style.display = tourIndex === TOUR_STEPS.length - 1 ? 'none' : '';
                }
            }

            highlightTarget(step);
            positionTourCard();
        }

        function openTour() {
            tourIndex = 0;
            if (tour) {
                tour.hidden = false;
                tour.setAttribute('aria-hidden', 'false');
            }
            updateTourUI();
        }

        function closeTour({ completed } = { completed: false }) {
            if (tour) {
                tour.hidden = true;
                tour.setAttribute('aria-hidden', 'true');
            }
            if (highlightedElement) {
                highlightedElement.classList.remove('assistant-highlight');
            }
            highlightedElement = null;
            if (completed) {
                showToast('Tour completed! You can now use the assistant anytime.');
            }
        }

        if (sendButton) {
            sendButton.addEventListener('click', handleSend);
        }

        if (input) {
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === 'Return') {
                    event.preventDefault();
                    handleSend();
                }
            });
        }

        window.addEventListener('resize', positionTourCard);

        startTourButtons.forEach((btn) => {
            btn.addEventListener('click', openTour);
        });

        if (tourNext) {
            tourNext.addEventListener('click', () => {
                if (tourIndex < TOUR_STEPS.length - 1) {
                    tourIndex += 1;
                    updateTourUI();
                } else {
                    closeTour({ completed: true });
                }
            });
        }

        [tourSkipPrimary, tourSkipSecondary].forEach((btn) => {
            if (!btn) return;
            btn.addEventListener('click', () => closeTour({ completed: false }));
        });

        renderMessages();
    });
})();
