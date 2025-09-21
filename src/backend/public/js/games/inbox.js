class EmailSortingGame {
    constructor() {
        this.gameData = null;
        this.emails = [];
        this.originalEmails = [];
        this.score = 0;
        this.correct = 0;
        this.total = 0;
        this.streak = 0;
        this.maxLives = 3;
        this.lives = this.maxLives;
        this.timeLeft = 120;
        this.gameActive = false;
        this.timer = null;
        this.draggedEmailId = null;

        this.loadGameData().then(() => {
            this.initializeGame();
        });
    }

    // ✅ 随机抽题逻辑保留
    selectRandomEmails(allEmails, scamCount = 6, normalCount = 4) {
        const scamEmails = allEmails.filter(e => e.type === "scam");
        const normalEmails = allEmails.filter(e => e.type !== "scam");

        const randomScam = scamEmails.sort(() => 0.5 - Math.random()).slice(0, scamCount);
        const randomNormal = normalEmails.sort(() => 0.5 - Math.random()).slice(0, normalCount);

        return [...randomScam, ...randomNormal].sort(() => 0.5 - Math.random());
    }

    async loadGameData() {
        try {
            const response = await fetch('js/games/game-data.json');
            this.gameData = await response.json();
            this.emails = this.selectRandomEmails(this.gameData.emails, 6, 4);
            this.originalEmails = [...this.gameData.emails];
            this.timeLeft = this.gameData.gameSettings.initialTime;
        } catch (error) {
            console.error('Error loading game data:', error);
            // fallback 数据
            this.gameData = {
                emails: [
                    { id: '1', sender: 'Council', subject: 'Reminder of bin collection', icon: '🏛️', type: "normal" },
                    { id: '2', sender: 'Weather', subject: 'Severe weather alert', icon: '🌧️', type: "normal" },
                    { id: '3', sender: 'security@fakebank.com', subject: 'Your account is compromised!', icon: '🛡️', type: "scam" }
                ],
                gameSettings: { initialTime: 120, correctPoints: 10, incorrectPenalty: 5, streakBonus: 2 },
                gameTips: [
                    'Identify suspicious email features (urgent, lottery, etc.)',
                    'Correctly sorting suspicious emails earns 10 points'
                ]
            };
            this.emails = [...this.gameData.emails];
            this.originalEmails = [...this.gameData.emails];
            this.timeLeft = this.gameData.gameSettings.initialTime;
        }
    }

    initializeGame() {
        this.initializeDOM();
        this.renderEmails();
        this.renderGameTips();
        this.updateStats();
        this.updateHearts(); // ✅ 初始渲染心心
        this.setupEventListeners();
    }

    initializeDOM() {
        this.elements = {
            toggleGame: document.getElementById('toggleGame'),
            resetGame: document.getElementById('resetGame'),
            playIcon: document.getElementById('playIcon'),
            pauseIcon: document.getElementById('pauseIcon'),
            gameButtonText: document.getElementById('gameButtonText'),
            scoreValue: document.getElementById('scoreValue'),
            accuracyValue: document.getElementById('accuracyValue'),
            streakValue: document.getElementById('streakValue'),
            timeValue: document.getElementById('timeValue'),
            livesValue: document.getElementById('livesValue'),
            emailCount: document.getElementById('emailCount'),
            emailsContainer: document.getElementById('emailsContainer'),
            completionMessage: document.getElementById('completionMessage'),
            finalScore: document.getElementById('finalScore'),
            trashBin: document.getElementById('trashBin'),
            trashDescription: document.getElementById('trashDescription'),
            trashWarning: document.getElementById('trashWarning'),
            trashScoreValue: document.getElementById('trashScoreValue'),
            gameStatus: document.getElementById('gameStatus'),
            gameOverModal: document.getElementById('gameOverModal'),
            modalFinalScore: document.getElementById('modalFinalScore'),
            modalAccuracy: document.getElementById('modalAccuracy'),
            modalStreak: document.getElementById('modalStreak'),
            playAgainBtn: document.getElementById('playAgainBtn'),
            successAnimation: document.getElementById('successAnimation'),
            errorAnimation: document.getElementById('errorAnimation'),
            tipsList: document.getElementById('tipsList'),
            smallHeartsWrapper: document.querySelector('.small-hearts-wrapper')
        };
    }

    setupEventListeners() {
        this.elements.toggleGame.addEventListener('click', () => this.toggleGame());
        this.elements.resetGame.addEventListener('click', () => this.resetGame());
        this.elements.playAgainBtn.addEventListener('click', () => this.resetGame());

        this.elements.trashBin.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.elements.trashBin.addEventListener('dragleave', () => this.handleDragLeave());
        this.elements.trashBin.addEventListener('drop', (e) => this.handleDrop(e));
    }

    renderGameTips() {
        if (this.elements.tipsList && this.gameData.gameTips) {
            this.elements.tipsList.innerHTML = '';
            this.gameData.gameTips.forEach(tip => {
                const li = document.createElement('li');
                li.textContent = `• ${tip}`;
                this.elements.tipsList.appendChild(li);
            });
        }
    }

    renderEmails() {
        this.elements.emailsContainer.innerHTML = '';
        this.elements.emailCount.textContent = `(${this.emails.length} emails)`;

        if (this.emails.length === 0) {
            this.elements.completionMessage.classList.remove('hidden');
            this.elements.finalScore.textContent = this.score;
            return;
        } else {
            this.elements.completionMessage.classList.add('hidden');
        }

        this.emails.forEach(email => {
            const emailCard = this.createEmailCard(email);
            this.elements.emailsContainer.appendChild(emailCard);
        });
    }

    createEmailCard(email) {
        const isScam = email.type === "scam";
        const card = document.createElement('div');
        card.className = `email-card ${isScam ? 'suspicious' : ''}`;
        card.draggable = true;
        card.dataset.emailId = email.id;

        card.innerHTML = `
            ${isScam ? `
                <div class="suspicious-indicator">
                    <div class="suspicious-dot"></div>
                </div>
            ` : ''}
            
            <div class="email-content">
                <div class="email-icon ${isScam ? 'suspicious' : ''}">
                    ${email.emoji || email.icon || "📧"}
                </div>
                <div class="email-text">
                    <p class="email-sender">${email.aria || email.sender}</p>
                    <h3 class="email-subject">${email.text || email.subject}</h3>
                </div>
            </div>

            <div class="drag-hint">
                <span class="hint-text">Drag to Sort</span>
            </div>
        `;

        card.addEventListener('dragstart', (e) => this.handleEmailDragStart(e, email.id));
        card.addEventListener('dragend', () => this.handleEmailDragEnd());

        return card;
    }

    handleEmailDragStart(e, emailId) {
        this.draggedEmailId = emailId;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', emailId);
        e.target.classList.add('dragging');
    }

    handleEmailDragEnd() {
        const draggingCard = document.querySelector('.email-card.dragging');
        if (draggingCard) draggingCard.classList.remove('dragging');
        this.draggedEmailId = null;
    }

    handleDragOver(e) {
        e.preventDefault();
        this.elements.trashBin.classList.add('drag-over');
        this.elements.trashDescription.textContent = 'Release mouse to delete email';
    }

    handleDragLeave() {
        this.elements.trashBin.classList.remove('drag-over');
        this.elements.trashDescription.textContent = 'Drag suspicious emails here';
    }

    handleDrop(e) {
        e.preventDefault();
        this.elements.trashBin.classList.remove('drag-over');
        this.elements.trashDescription.textContent = 'Drag suspicious emails here';

        const emailId = e.dataTransfer.getData('text/plain');
        if (emailId) this.handleEmailDrop(emailId);
    }

    handleEmailDrop(emailId) {
        const email = this.emails.find(e => e.id === emailId);
        if (!email) return;

        if (!this.gameActive) {
            this.toggleGame();
        }

        this.total += 1;

        if (email.type === "scam") {
            this.correct += 1;
            this.score += this.gameData.gameSettings.correctPoints
                + (this.streak * this.gameData.gameSettings.streakBonus);
            this.streak += 1;
            this.showSuccessAnimation();
        } else {
            this.lives -= 1;
            this.updateHearts();
            this.streak = 0;
            this.showErrorAnimation();

            if (this.lives <= 0) {
                this.endGame(false);
                return;
            }
        }

        this.emails = this.emails.filter(e => e.id !== emailId);
        this.renderEmails();
        this.updateStats();

        const hasScam = this.emails.some(e => e.type === "scam");
        if (!hasScam) {
            this.endGame(true);
        }
    }

    updateStats() {
        this.elements.scoreValue.textContent = this.score;
        this.elements.trashScoreValue.textContent = this.score;
        this.elements.streakValue.textContent = this.streak;
        this.elements.timeValue.textContent = `${this.timeLeft}s`;
        this.elements.livesValue.textContent = `${this.lives}/${this.maxLives}`;
        const accuracy = this.total > 0 ? Math.round((this.correct / this.total) * 100) : 0;
        this.elements.accuracyValue.textContent = `${accuracy}%`;
    }

    updateHearts() {
        this.elements.smallHeartsWrapper.innerHTML = "";

        for (let i = 0; i < this.maxLives; i++) {
            const heart = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            heart.setAttribute("viewBox", "0 0 24 24");
            heart.classList.add("small-heart-icon");

            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z");

            if (i < this.lives) {
                heart.classList.add("heart-full");
                heart.setAttribute("fill", "currentColor");
            } else {
                heart.classList.add("heart-empty");
                heart.setAttribute("fill", "none");
                heart.setAttribute("stroke", "currentColor");
                heart.setAttribute("stroke-width", "2");
            }

            heart.appendChild(path);
            this.elements.smallHeartsWrapper.appendChild(heart);
        }
    }

    showSuccessAnimation() {
        this.elements.successAnimation.classList.add('show');
        setTimeout(() => this.elements.successAnimation.classList.remove('show'), 1000);
    }

    showErrorAnimation() {
        this.elements.errorAnimation.classList.add('show');
        setTimeout(() => this.elements.errorAnimation.classList.remove('show'), 1000);
    }

    toggleGame() {
        this.gameActive = !this.gameActive;

        if (this.gameActive) {
            this.startTimer();
            this.elements.playIcon.classList.add('hidden');
            this.elements.pauseIcon.classList.remove('hidden');
            this.elements.gameButtonText.textContent = 'Pause Game';
            this.elements.gameStatus.classList.add('hidden');
        } else {
            this.stopTimer();
            this.elements.playIcon.classList.remove('hidden');
            this.elements.pauseIcon.classList.add('hidden');
            this.elements.gameButtonText.textContent = 'Start Game';
            if (this.timeLeft > 0) {
                this.elements.gameStatus.classList.remove('hidden');
            }
        }
    }

    startTimer() {
        this.timer = setInterval(() => {
            this.timeLeft -= 1;
            this.updateStats();
            if (this.timeLeft <= 0) {
                this.endGame(false);
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    endGame(isVictory = false) {
        this.gameActive = false;
        this.stopTimer();

        this.elements.modalFinalScore.textContent = this.score;
        const accuracy = this.total > 0 ? Math.round((this.correct / this.total) * 100) : 0;
        this.elements.modalAccuracy.textContent = `${accuracy}%`;
        this.elements.modalStreak.textContent = this.streak;

        const modalContent = this.elements.gameOverModal.querySelector('.modal-content');
        modalContent.classList.remove('victory');

        if (isVictory) {
            modalContent.classList.add('victory');
            modalContent.querySelector('.modal-icon').textContent = "🏆";
            modalContent.querySelector('.modal-title').textContent = "You Win!";
        } else if (this.lives <= 0) {
            modalContent.querySelector('.modal-icon').textContent = "💔";
            modalContent.querySelector('.modal-title').textContent = "No Lives Left!";
        } else {
            modalContent.querySelector('.modal-icon').textContent = "⏰";
            modalContent.querySelector('.modal-title').textContent = "Time's Up!";
        }

        this.elements.gameOverModal.classList.remove('hidden');
    }

    resetGame() {
        this.lives = this.maxLives;
        this.emails = this.selectRandomEmails(this.gameData.emails, 6, 4);
        this.score = 0;
        this.correct = 0;
        this.total = 0;
        this.streak = 0;
        this.timeLeft = this.gameData.gameSettings.initialTime;
        this.gameActive = false;

        this.stopTimer();

        this.elements.playIcon.classList.remove('hidden');
        this.elements.pauseIcon.classList.add('hidden');
        this.elements.gameButtonText.textContent = 'Start Game';
        this.elements.gameStatus.classList.add('hidden');
        this.elements.gameOverModal.classList.add('hidden');

        this.renderEmails();
        this.updateHearts();
        this.updateStats();
    }
}

// 初始化
document.addEventListener("DOMContentLoaded", () => {
    new EmailSortingGame();
});
