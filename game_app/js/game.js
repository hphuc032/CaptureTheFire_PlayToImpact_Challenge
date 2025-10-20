console.log("game.js loaded");

// ===========================
// game.js
// ===========================

// Game state
let currentTopic = "";
let currentIndex = 0;
let score = 0;

// DOM elements
const menuScreen = document.getElementById("menu-screen");
const playScreen = document.getElementById("play-screen");
const resultScreen = document.getElementById("result-screen");
const questionContainer = document.getElementById("question-container");
const answerInput = document.getElementById("answer-input");
const scoreDisplay = document.getElementById("score-display");
const finalScore = document.getElementById("final-score");

// Questions (demo, có thể mở rộng)
const questions = {
    circulatory: [
        {question: "What is the main function of red blood cells?", answer: "transport oxygen", hint: "Think about oxygen transport."},
        {question: "Which organ pumps blood throughout the body?", answer: "heart", hint: "It's the main circulatory organ."}
    ],
    digestive: [
        {question: "Which organ breaks down food chemically?", answer: "stomach", hint: "It uses acids and enzymes."},
        {question: "Where does nutrient absorption mainly occur?", answer: "small intestine", hint: "Long, coiled tube."}
    ]
};

// ===========================
// Start Game
// ===========================
document.getElementById("start-btn").addEventListener("click", () => {
    const topicSelect = document.getElementById("topic-select");
    currentTopic = topicSelect.value;
    currentIndex = 0;
    score = 0;
    scoreDisplay.textContent = `Score: ${score}`;

    menuScreen.classList.add("hidden");
    playScreen.classList.remove("hidden");

    showQuestion();
});

// ===========================
// Show question
// ===========================
function showQuestion() {
    const q = questions[currentTopic][currentIndex];
    if(!q) return;

    questionContainer.textContent = q.question;
    answerInput.value = "";

    // Cập nhật chatbot hint
    if(typeof Chatbot !== "undefined") {
        Chatbot.currentHint = q.hint; // lưu hint cho chatbot dùng
    }
}

// ===========================
// Submit answer
// ===========================
document.getElementById("submit-answer").addEventListener("click", () => {
    const userAnswer = answerInput.value.toLowerCase().trim();
    const correctAnswer = questions[currentTopic][currentIndex].answer.toLowerCase();

    if(userAnswer === correctAnswer) {
        score += 10;
        alert("Correct! +10 points");
    } else {
        alert(`Incorrect! Hint: ${questions[currentTopic][currentIndex].hint}`);
    }

    scoreDisplay.textContent = `Score: ${score}`;

    currentIndex++;
    if(currentIndex < questions[currentTopic].length) {
        showQuestion();
    } else {
        endGame();
    }
});

// ===========================
// End Game
// ===========================
function endGame() {
    playScreen.classList.add("hidden");
    resultScreen.classList.remove("hidden");
    finalScore.textContent = `Your final score: ${score}`;
}

// ===========================
// Restart Game
// ===========================
document.getElementById("restart-btn").addEventListener("click", () => {
    resultScreen.classList.add("hidden");
    menuScreen.classList.remove("hidden");
});
