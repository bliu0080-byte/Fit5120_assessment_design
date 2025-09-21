// Quiz Application Logic

// Quiz State Variables
let currentModule = null;
let currentQuestionIndex = 0;
let score = 0;
let answers = [];
let hasAnswered = false;

// Module Information
const moduleInfo = [
    {
        id: 'phone',
        icon: '📱',
        title: 'Phone Scams',
        description: 'Learn to identify fake calls from ATO, banks, tech support, and family emergencies',
        questions: '10 Questions',
        duration: '3 min',        // 🆕 时长
        participants: 500         // 🆕 初始人数


    },
    {
        id: 'web',
        icon: '🌐',
        title: 'Web Phishing',
        description: 'Spot fake websites, malicious links, and fraudulent online shops',
        questions: '10 Questions',
        duration: '4 min',        // 🆕 时长
        participants: 400         // 🆕 初始人数

    },
    {
        id: 'email',
        icon: '✉️',
        title: 'Email & Message Scams',
        description: 'Recognize phishing emails, fake prizes, and suspicious attachments',
        questions: 'Start answering',
        duration: '5 min',        // 🆕 时长
        participants: 300         // 🆕 初始人数

    }
];

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    initializeModules();
    setupEventListeners();
});

// Initialize module cards
function initializeModules() {
    const moduleSelection = document.getElementById("moduleSelection");
    const moduleImages = {
      phone: "./assets/images/phone.png",
      web: "./assets/images/web.png",
      email: "./assets/images/email.png",
    };
  
    moduleSelection.innerHTML = moduleInfo
      .map(
        (m) => `
          <div class="module-card" data-module="${m.id}" role="button" tabindex="0" aria-label="${m.title}">
            <div class="mc-topbar"></div>
            <div class="mc-grid">
              
              <div class="mc-body">
                <div class="mc-title">${m.title}</div>
                <div class="mc-desc">${m.description}</div>
              </div>
    
              <div class="mc-media">
                ${
                  moduleImages[m.id]
                    ? `<img src="${moduleImages[m.id]}" alt="${m.title} illustration" class="mc-img" />`
                    : `<div class="mc-emoji" aria-hidden="true">${m.icon || "🛡️"}</div>`
                }
              </div>
            
              <div class="mc-footer">
                <button class="mc-cta" data-module="${m.id}" type="button">🕵️‍♂️ Try Now!</button>
                <div class="module-meta">
                  <span class="meta-item">
                    <i class="fa-solid fa-clock"></i> ${m.duration}
                  </span>
                  <span class="meta-item">
                    <i class="fa-solid fa-users"></i> 
                    <span class="participant-count" id="count-${m.id}">${m.participants}</span> users
                  </span>
                </div>
              </div>
    
            </div>
          </div>
        `
      )
      .join("");
  
    document.querySelectorAll(".module-card").forEach((card) => {
      const id = card.getAttribute("data-module");
      card.addEventListener("click", () => startModule(id));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startModule(id);
        }
      });
      card.querySelector(".mc-cta")?.addEventListener("click", (e) => {
        e.stopPropagation();
        startModule(id);
      });
    });
  }
  
  

// Setup event listeners
function setupEventListeners() {
    document.getElementById('nextButton').addEventListener('click', nextQuestion);
    document.getElementById('backToModulesBtn').addEventListener('click', backToModules);
    document.getElementById('tryAnotherBtn').addEventListener('click', backToModules);

    // Keyboard navigation
    document.addEventListener('keydown', function (e) {
        if (currentModule && hasAnswered) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                nextQuestion();
            }
        }
    });
}

// Start a quiz module
function startModule(moduleType) {
    console.log("Start Quiz clicked, module =", moduleType);
    currentModule = moduleType;
    currentQuestionIndex = 0;
    score = 0;
    answers = [];
    hasAnswered = false;

    // Show quiz container, hide module selection
    document.getElementById('quizModal').style.display = 'block';
    document.getElementById('resultsContainer').style.display = 'none';
    document.getElementById('questionContainer').style.display = 'block';
    document.getElementById('nextButton').style.display = 'block';

    // Set quiz title
    document.getElementById('quizTitle').textContent = quizData[moduleType].title;

    loadQuestion();
}

// Load current question
function loadQuestion() {
    const module = quizData[currentModule];
    const question = module.questions[currentQuestionIndex];
    const container = document.getElementById('questionContainer');

    // Update progress bar
    const progress = ((currentQuestionIndex + 1) / module.questions.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';

    // Build question HTML
    let html = `
        <div class="question-number">Question ${currentQuestionIndex + 1} of ${module.questions.length}</div>
    `;

    // Add scenario if present
    if (question.scenario) {
        html += `
            <div class="scenario-box">
                <strong>Scenario:</strong><br>
                ${question.scenario}
            </div>
        `;
    }

    // Add question text
    html += `
        <div class="question-text">${question.question}</div>
        <div class="options-container" id="optionsContainer">
    `;

    // Add options
    question.options.forEach((option, index) => {
        html += `
            <button class="option-button" data-index="${index}" id="option-${index}">
                ${String.fromCharCode(65 + index)}) ${option}
            </button>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Add click handlers to options
    document.querySelectorAll('.option-button').forEach(button => {
        button.addEventListener('click', function () {
            const index = parseInt(this.getAttribute('data-index'));
            selectAnswer(index);
        });
    });

    // Reset state for new question
    hasAnswered = false;
    document.getElementById('nextButton').disabled = true;
    document.getElementById('feedbackContainer').style.display = 'none';

    // Update next button text
    const isLastQuestion = currentQuestionIndex === module.questions.length - 1;
    document.getElementById('nextButton').textContent = isLastQuestion ? 'View Results' : 'Next Question';
}

// Handle answer selection
function selectAnswer(optionIndex) {
    if (hasAnswered) return;

    hasAnswered = true;
    const module = quizData[currentModule];
    const question = module.questions[currentQuestionIndex];
    const isCorrect = optionIndex === question.correctAnswer;

    // Update score if correct
    if (isCorrect) {
        score++;
    }

    // Store answer for potential review
    answers.push({
        questionIndex: currentQuestionIndex,
        selectedAnswer: optionIndex,
        isCorrect: isCorrect
    });

    // Update UI - show correct/incorrect states
    const options = document.querySelectorAll('.option-button');
    options.forEach((option, index) => {
        option.classList.add('disabled');
        if (index === question.correctAnswer) {
            option.classList.add('correct');
        } else if (index === optionIndex && !isCorrect) {
            option.classList.add('incorrect');
        }
    });

    // Show feedback
    showFeedback(isCorrect, question.explanation);

    // Enable next button
    document.getElementById('nextButton').disabled = false;
}

// Show feedback after answering
function showFeedback(isCorrect, explanation) {
    const feedbackContainer = document.getElementById('feedbackContainer');
    feedbackContainer.className = 'feedback-container ' + (isCorrect ? 'correct' : 'incorrect');
    feedbackContainer.innerHTML = `
        <div class="feedback-title">
            ${isCorrect ? '✅ Correct!' : '❌ Not quite right'}
        </div>
        <div class="feedback-explanation">${explanation}</div>
    `;
    feedbackContainer.style.display = 'block';

    // === 插入 GIF 动画 ===
    const gifContainer = document.getElementById('gifContainer');
    if (gifContainer) gifContainer.innerHTML = ""; // 清空旧的 GIF
    const gifPath = isCorrect ? './assets/images/correct.gif' : './assets/images/error.gif';
    gifContainer.innerHTML = `<img src="${gifPath}" alt="Feedback Animation" />`;

    // Scroll to feedback for mobile users
    setTimeout(() => {
        feedbackContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}


// Move to next question
function nextQuestion() {
    const module = quizData[currentModule];
    currentQuestionIndex++;

    // 👇 每次切换题目前先清空反馈和 gif
    const feedbackContainer = document.getElementById("feedbackContainer");
    if (feedbackContainer) {
        feedbackContainer.style.display = "none";
        feedbackContainer.innerHTML = "";
    }

    const gifContainer = document.getElementById("gifContainer");
    if (gifContainer) {
        gifContainer.innerHTML = "";
    }

    if (currentQuestionIndex < module.questions.length) {
        loadQuestion();
    } else {
        showResults();
    }
}


// Show quiz results
function showResults() {
    const module = quizData[currentModule];
    const percentage = Math.round((score / module.questions.length) * 100);

    // Hide question elements
    document.getElementById('questionContainer').style.display = 'none';
    document.getElementById('feedbackContainer').style.display = 'none';
    document.getElementById('nextButton').style.display = 'none';
    document.getElementById('resultsContainer').style.display = 'block';

    // Display score
    document.getElementById('scoreText').textContent = `${score}/${module.questions.length}`;

    // Determine feedback message and takeaways based on performance
    let message = '';
    let takeaways = [];

    if (percentage >= 80) {
        message = "Excellent work! You have a strong understanding of how to identify and avoid scams. Keep staying vigilant!";
        takeaways = [
            "✅ You can identify common scam tactics",
            "✅ You know how to verify suspicious contacts",
            "✅ You understand safe online practices"
        ];
    } else if (percentage >= 60) {
        message = "Good effort! You understand many scam tactics, but there's room to improve your awareness. Review the areas where you were unsure.";
        takeaways = [
            "⚠️ Review how scammers use urgency and fear",
            "⚠️ Remember to always verify through official channels",
            "✅ You're developing good scam awareness"
        ];
    } else {
        message = "You've made a great start! Scam awareness takes practice. Review the explanations and try again to build your confidence.";
        takeaways = [
            "📚 Never trust caller ID - it can be faked",
            "📚 Government agencies never demand gift cards",
            "📚 Always verify requests through official channels"
        ];
    }

    // Update results display
    document.getElementById('resultsMessage').textContent = message;

    // Build takeaways HTML
    let breakdownHTML = '';
    takeaways.forEach(takeaway => {
        const icon = takeaway.substring(0, 2);
        const text = takeaway.substring(2).trim();
        breakdownHTML += `
            <div class="breakdown-item">
                <div class="breakdown-icon">${icon}</div>
                <div>${text}</div>
            </div>
        `;
    });
    document.getElementById('breakdownContent').innerHTML = breakdownHTML;

    // Scroll to top of results
    document.getElementById('resultsContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });

    // ⭐ 新增：完成一次 quiz 后，参与人数 +1
    const counter = document.getElementById(`count-${currentModule}`);
    if (counter) {
        let current = parseInt(counter.textContent.replace(/,/g, ""), 10);
        current++;
        counter.textContent = current.toLocaleString();
    }
}

    // Update results display
    document.getElementById('resultsMessage').textContent = message;

    // Build takeaways HTML
    let breakdownHTML = '';
    takeaways.forEach(takeaway => {
        const icon = takeaway.substring(0, 2);
        const text = takeaway.substring(2).trim();
        breakdownHTML += `
            <div class="breakdown-item">
                <div class="breakdown-icon">${icon}</div>
                <div>${text}</div>
            </div>
        `;
    });
    document.getElementById('breakdownContent').innerHTML = breakdownHTML;

    // Scroll to top of results
    document.getElementById('resultsContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });


// Return to module selection
function backToModules() {
    // Show module selection, hide quiz
    document.getElementById('quizModal').style.display = 'none';
    document.getElementById('questionContainer').style.display = 'block';
    document.getElementById('nextButton').style.display = 'block';

    // Reset current module
    currentModule = null;

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Helper function to get module stats (can be expanded for tracking)
function getModuleStats(moduleId) {
    const module = quizData[moduleId];
    return {
        totalQuestions: module.questions.length,
        completed: false,
        lastScore: null,
        attempts: 0
    };
}

// Optional: Add function to track progress in localStorage
function saveProgress() {
    if (currentModule && typeof (Storage) !== "undefined") {
        const progress = {
            module: currentModule,
            score: score,
            totalQuestions: quizData[currentModule].questions.length,
            date: new Date().toISOString()
        };

        // Get existing progress
        let allProgress = JSON.parse(localStorage.getItem('scamQuizProgress') || '[]');
        allProgress.push(progress);

        // Keep only last 10 entries
        if (allProgress.length > 10) {
            allProgress = allProgress.slice(-10);
        }

        localStorage.setItem('scamQuizProgress', JSON.stringify(allProgress));
    }
}

// Optional: Add function to get user's progress history
function getProgressHistory() {
    if (typeof (Storage) !== "undefined") {
        return JSON.parse(localStorage.getItem('scamQuizProgress') || '[]');
    }
    return [];
}
// 关闭按钮
document.getElementById('closeQuizModal').onclick = function () {
    document.getElementById('quizModal').style.display = 'none';
    backToModules();
};

// 点击背景关闭
window.onclick = function (event) {
    const modal = document.getElementById('quizModal');
    if (event.target === modal) {
        modal.style.display = 'none';
        backToModules();
    }
};