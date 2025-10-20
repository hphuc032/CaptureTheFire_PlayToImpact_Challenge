// game_app/js/chatbot.js
// Frontend chat helper for Health Quiz Game
// - Đặt file ở: game_app/js/chatbot.js
// - index.html nên load chatbot.js TRƯỚC game.js
// - Có thể chạy OFFLINE (không cần backend). Khi có backend, bật USE_BACKEND = true.

(function () {
  'use strict';

  // ===== CẤU HÌNH NHANH =====
  const USE_BACKEND = false; // <-- OFFLINE mặc định. Đổi thành true nếu bạn có server /api/chat
  const BASE = window.CHAT_ENDPOINT_BASE || ''; // ví dụ: "http://localhost:3000"
  const CHAT_ENDPOINT = BASE + '/api/chat';     // route backend dự kiến

  // --- DOM helpers ---
  const $ = (id) => document.getElementById(id);

  function appendChatLine(text, who = 'assistant') {
    // who: 'you' | 'assistant' | 'system'
    const log = $('chat-log');
    if (!log) {
      console.log('[chat]', who + ':', text);
      return;
    }
    const row = document.createElement('div');
    row.className = 'chat-row';

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble ' + (who === 'you' ? 'chat-user' : 'chat-bot');
    if (who === 'system') bubble.className = 'chat-bubble chat-bot'; // hệ thống cũng là màu bot
    bubble.textContent = text;

    row.appendChild(bubble);
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  // --- Backend call (nếu bật USE_BACKEND) ---
  async function callBackend(payload) {
    try {
      const res = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.error('Chat backend error', res.status, txt);
        return { ok: false, text: `Assistant backend error (${res.status}).` };
    }
      const j = await res.json().catch(() => null);
      if (!j) return { ok: false, text: null };
      return { ok: true, text: j.reply || j.text || '' };
    } catch (err) {
      console.error('Network error calling /api/chat', err);
      return { ok: false, text: null };
    }
  }

  // --- OFFLINE assistant (fallback) ---
  function localAssistant(payload = {}) {
    // Không trả lời đáp án trực tiếp, chỉ gợi ý khái niệm/từ khóa
    const user = (payload.message || '').toString().trim();
    const q = (payload.quizQuestion || '').toString();
    const hint = (payload.quizHint || '').toString();

    const directPattern = /\b(give me the answer|what is the answer|tell me the answer|answer:|just tell me)\b/i;
    if (directPattern.test(user)) {
      return "I can't provide the exact quiz answer. Try asking for concepts, mechanisms, or key terms related to the topic.";
    }

    // Nếu có hint của câu hỏi hiện tại, ưu tiên trả về hint
    if (hint) {
      return `Here is a study hint: ${hint}\nTry to define terms and connect cause → process → outcome.`;
    }

    // Trả lời chung nếu không có hint
    const generic = [
      "Break the question into smaller parts. What process or organ is central here?",
      "Search for definitions, functions, inputs/outputs, and typical disorders related to the topic.",
      "Compare similar terms and list differences; then map them back to the question.",
      "Look for keywords: function / location / mechanism / examples / related symptoms."
    ];
    return (q ? `About this question: "${q}". ` : '') + generic[Math.floor(Math.random() * generic.length)];
  }

  // --- public: sendToAssistant(payload) ---
  // payload: { message, quizQuestion, quizHint, questionType }
  async function sendToAssistant(payload = {}) {
    const msg = (payload.message || '').toString().trim();
    if (!msg) return 'Please enter a message.';

    // Chặn yêu cầu đòi đáp án trực tiếp
    const directPattern = /\b(give me the answer|what is the answer|tell me the answer|answer:|just tell me)\b/i;
    if (directPattern.test(msg)) {
      return "I can't provide the exact quiz answer. I can explain concepts or give step-by-step hints.";
    }

    // Dùng backend nếu bật
    if (USE_BACKEND) {
      const r = await callBackend(payload);
      if (r.ok && r.text) return r.text;
      // nếu backend lỗi → rơi xuống fallback
    }

    // Fallback: hỏi game.js để lấy hint hiện tại
    try {
      if (typeof window.getCurrentQuizQuestion === 'function') {
        const q = window.getCurrentQuizQuestion() || {};
        return localAssistant({ ...payload, quizQuestion: q.question || '', quizHint: q.hint || '' });
      }
    } catch (e) { /* ignore */ }

    // fallback cuối
    return localAssistant(payload);
  }

  // --- Binder UI mặc định ---
  function bindDefaultUi() {
    const input = $('chat-input');
    const sendBtn = $('chat-send');
    if (!input || !sendBtn) return; // không có UI chat trong trang

    sendBtn.addEventListener('click', async () => {
      const userText = input.value.trim();
      if (!userText) return;

      appendChatLine('You: ' + userText, 'you');

      // Cho phép game.js can thiệp trước khi gửi (giới hạn hint, v.v.)
      if (typeof window.onBeforeSend === 'function') {
        try {
          const result = await window.onBeforeSend(userText);
          if (result === false || (result && result.allow === false)) return; // bị chặn
          if (result && typeof result.message === 'string') {
            await doSend(result.message);
            input.value = '';
            return;
          }
        } catch (e) {
          console.warn('onBeforeSend error', e);
        }
      }

      await doSend(userText);
      input.value = '';
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendBtn.click();
      }
    });

    async function doSend(messageText) {
      appendChatLine('System: sending to assistant...', 'system');

      // Lấy context câu hỏi hiện tại từ game.js nếu có
      let ctx = {};
      if (typeof window.getCurrentQuizQuestion === 'function') {
        try { ctx = window.getCurrentQuizQuestion() || {}; } catch { ctx = {}; }
      } else if (window.questions && window.currentTopic != null && window.currentIndex != null) {
        const q = (window.questions[window.currentTopic] || [])[window.currentIndex] || {};
        ctx = { question: q.question, hint: q.hint, type: q.type };
      }

      const payload = {
        message: messageText,
        quizQuestion: ctx.question || '',
        quizHint: ctx.hint || '',
        questionType: ctx.type || ''
      };

      const reply = await sendToAssistant(payload);
      appendChatLine('Assistant: ' + reply, 'assistant');
    }
  }

  // Auto-bind
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindDefaultUi);
  } else {
    bindDefaultUi();
  }

  // Xuất hàm toàn cục để game.js có thể dùng
  window.chatHelpers = { sendToAssistant, appendChatLine };
  window.sendToAssistant = sendToAssistant;
  window.appendChatLine = appendChatLine;

  console.info('chatbot.js loaded — offline mode:', !USE_BACKEND);
})();
