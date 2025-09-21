class EmailSortingGame {
    constructor() {
        this.gameData = null;
        this.emails = [];
        this.originalEmails = [];
        this.score = 0;
        this.correct = 0;
        this.total = 0;
        this.streak = 0;
        this.lives = 3;
        this.timeLeft = 120;
        this.gameActive = false;
        this.timer = null;
        this.draggedEmailId = null;

        this.loadGameData().then(() => {
            this.initializeGame();
        });
    }
    selectRandomEmails(allEmails, scamCount = 6, normalCount = 4) {
    const scamEmails = allEmails.filter(e => e.type === "scam");
    const normalEmails = allEmails.filter(e => e.type !== "scam");

    const randomScam = scamEmails.sort(() => 0.5 - Math.random()).slice(0, scamCount);
    const randomNormal = normalEmails.sort(() => 0.5 - Math.random()).slice(0, normalCount);

    // 合并后再打乱
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
            // Fallback data if JSON fails to load
            this.gameData = {
                emails: [
                    {
                        id: '1',
                        sender: 'Council',
                        subject: 'Reminder of bin collection day change',
                        icon: '🏛️',
                        type: "normal"
                    },
                    {
                        id: '2',
                        sender: 'Weather warning from the Bureau of Meteorology',
                        subject: 'Severe weather alert for your area',
                        icon: '🌧️',
                        type: "normal"
                    },
                    {
                        id: '3',
                        sender: 'security@fakebank.com',
                        subject: 'Urgent: Your account has been compromised!',
                        icon: '🛡️',
                        type: "scam"
                    }
                ],
                gameSettings: {
                    initialTime: 120,
                    correctPoints: 10,
                    incorrectPenalty: 5,
                    streakBonus: 2
                },
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
            livesValue: document.getElementById('livesValue'), // ✅ 绑定 Lives
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
            tipsList: document.getElementById('tipsList')
        };
    }

    setupEventListeners() {
        this.elements.toggleGame.addEventListener('click', () => this.toggleGame());
        this.elements.resetGame.addEventListener('click', () => this.resetGame());
        this.elements.playAgainBtn.addEventListener('click', () => this.resetGame());

        // Trash bin drag and drop
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
        if (draggingCard) {
            draggingCard.classList.remove('dragging');
        }
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
        if (emailId) {
            this.handleEmailDrop(emailId);
        }
    }

    showSuccessAnimation() {
        this.elements.successAnimation.classList.add('show');
        setTimeout(() => {
            this.elements.successAnimation.classList.remove('show');
        }, 1000);
    }

    showErrorAnimation() {
        this.elements.errorAnimation.classList.add('show');
        setTimeout(() => {
            this.elements.errorAnimation.classList.remove('show');
        }, 1000);
    }

    handleEmailDrop(emailId) {
        const email = this.emails.find(e => e.id === emailId);
        if (!email) return;

        // ✅ 如果游戏未开始，第一次拖动时自动开始倒计时
        if (!this.gameActive) {
            this.toggleGame();
        }

        this.total += 1;

        if (email.type === "scam") {
            // 拖对诈骗邮件，加分
            this.correct += 1;
            this.score += this.gameData.gameSettings.correctPoints 
                        + (this.streak * this.gameData.gameSettings.streakBonus);
            this.streak += 1;
            this.showSuccessAnimation();
        } else {
            // 拖错正常邮件，扣命
            this.lives -= 1;
            this.elements.livesValue.textContent = this.lives;
            this.streak = 0;
            this.showErrorAnimation();

            if (this.lives <= 0) {
                this.endGame();
                return;
            }
        }

        // 移除已处理的邮件
        this.emails = this.emails.filter(e => e.id !== emailId);
        this.renderEmails();
        this.updateStats();

        // ✅ 检查剩余邮件中是否还有 scam
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
        this.elements.livesValue.textContent = this.lives;

        const accuracy = this.total > 0 ? Math.round((this.correct / this.total) * 100) : 0;
        this.elements.accuracyValue.textContent = `${accuracy}%`;
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
                this.endGame();
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

        // 更新分数和统计
        this.elements.modalFinalScore.textContent = this.score;
        const accuracy = this.total > 0 ? Math.round((this.correct / this.total) * 100) : 0;
        this.elements.modalAccuracy.textContent = `${accuracy}%`;
        this.elements.modalStreak.textContent = this.streak;

        // 修改 Modal 样式和文字
        const modalContent = this.elements.gameOverModal.querySelector('.modal-content');
        modalContent.classList.remove('victory'); // 每次先清除

        if (isVictory) {
            // ✅ 游戏胜利
            modalContent.classList.add('victory');
            modalContent.querySelector('.modal-icon').textContent = "🏆";
            modalContent.querySelector('.modal-title').textContent = "You Win!";
        } else {
            // ❌ 游戏失败（超时 / 命用完）
            modalContent.classList.remove('victory');
            modalContent.querySelector('.modal-icon').textContent = "⏰";
            modalContent.querySelector('.modal-title').textContent = "Time's Up!";
        }

        // 显示 Modal
        this.elements.gameOverModal.classList.remove('hidden');
    }


    resetGame() {
        this.emails = this.selectRandomEmails(this.gameData.emails, 6, 4);
        this.score = 0;
        this.correct = 0;
        this.total = 0;
        this.streak = 0;
        this.lives = 3; // ✅ 重置命数
        this.timeLeft = this.gameData.gameSettings.initialTime;
        this.gameActive = false;
        
        this.stopTimer();
        
        this.elements.playIcon.classList.remove('hidden');
        this.elements.pauseIcon.classList.add('hidden');
        this.elements.gameButtonText.textContent = 'Start Game';
        this.elements.gameStatus.classList.add('hidden');
        this.elements.gameOverModal.classList.add('hidden');
        
        this.renderEmails();
        this.updateStats();
    }
}

// Initialize the game when the page loads
document.addEventListener("DOMContentLoaded", () => {
    new EmailSortingGame();

    const bgm = document.getElementById("bgm");
    const toggleMusic = document.getElementById("toggleMusic");

    if (toggleMusic && bgm) {
        toggleMusic.addEventListener("click", () => {
            if (bgm.paused) {
                bgm.play();
                toggleMusic.textContent = "🔇 Mute Music";
            } else {
                bgm.pause();
                toggleMusic.textContent = "🎵 Play Music";
            }
        });
    }
});
