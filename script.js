import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDOWuyS5_mqFn_tQVjvVYcC3cN0LJr0N9I",
  authDomain: "apo-ai-44c75.firebaseapp.com",
  projectId: "apo-ai-44c75",
  storageBucket: "apo-ai-44c75.firebasestorage.app",
  messagingSenderId: "62178907921",
  appId: "1:62178907921:web:2dc28703837926fb241eb0",
  measurementId: "G-F3GBX9D6TG"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const $ = (id) => document.getElementById(id);

const sidebar = $("sidebar");
const menuBtn = $("menuBtn");
const newChatBtn = $("newChatBtn");
const chatList = $("chatList");
const chatView = $("chatView");
const messages = $("messages");
const hero = $("hero");
const messageInput = $("messageInput");
const sendBtn = $("sendBtn");
const modeSelect = $("modeSelect");
const settingsModeSelect = $("settingsModeSelect");
const modeHint = $("modeHint");

const authModal = $("authModal");
const authTitle = $("authTitle");
const authSubtitle = $("authSubtitle");
const authSubmit = $("authSubmit");
const switchAuthMode = $("switchAuthMode");
const authForm = $("authForm");
const authClose = $("authClose");
const loginBtn = $("loginBtn");
const topLoginBtn = $("topLoginBtn");
const signupBtn = $("signupBtn");
const googleBtn = $("googleBtn");
const emailInput = $("emailInput");
const passwordInput = $("passwordInput");

const settingsModal = $("settingsModal");
const settingsBtn = $("settingsBtn");
const settingsClose = $("settingsClose");
const themeToggle = $("themeToggle");

let authMode = "login";
let currentUser = null;
let chats = JSON.parse(localStorage.getItem("apo_ai_chats") || "[]");
let activeChatId = null;

const modeDescriptions = {
  fast: "Fast • quickest replies",
  medium: "Medium • balanced reasoning",
  high: "High • deeper reasoning",
};

function saveChats() {
  localStorage.setItem("apo_ai_chats", JSON.stringify(chats));
}

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
}

function autoResize() {
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight, 180) + "px";
}

function updateModeUI() {
  modeHint.textContent = modeDescriptions[modeSelect.value];
  settingsModeSelect.value = modeSelect.value;
  localStorage.setItem("apo_ai_mode", modeSelect.value);
}

function renderChatList() {
  chatList.innerHTML = "";

  if (!chats.length) {
    const empty = document.createElement("div");
    empty.className = "sidebar-label";
    empty.textContent = "No chats yet";
    chatList.appendChild(empty);
    return;
  }

  chats.forEach((chat) => {
    const btn = document.createElement("button");
    btn.className = "chat-item" + (chat.id === activeChatId ? " active" : "");
    btn.innerHTML = `<span class="chat-title">${escapeHtml(chat.title)}</span>`;
    btn.addEventListener("click", () => openChat(chat.id));
    chatList.appendChild(btn);
  });
}

function renderMessages() {
  messages.innerHTML = "";
  const chat = chats.find((c) => c.id === activeChatId);

  if (!chat || !chat.messages.length) {
    hero.classList.remove("hidden");
    return;
  }

  hero.classList.add("hidden");

  chat.messages.forEach((msg) => {
    const wrap = document.createElement("div");
    wrap.className = `message ${msg.role}`;

    if (msg.role === "assistant") {
      const avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.textContent = "A";
      wrap.appendChild(avatar);
    }

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = msg.content;
    wrap.appendChild(bubble);

    messages.appendChild(wrap);
  });

  requestAnimationFrame(() => {
    chatView.scrollTop = chatView.scrollHeight;
  });
}

function newChat() {
  activeChatId = null;
  renderChatList();
  renderMessages();
  messageInput.focus();
}

function openChat(id) {
  activeChatId = id;
  renderChatList();
  renderMessages();
  if (window.innerWidth <= 800) sidebar.classList.remove("open");
}

function ensureChat(firstMessage) {
  if (activeChatId) return chats.find((c) => c.id === activeChatId);

  const chat = {
    id: makeId(),
    title: firstMessage.slice(0, 36) || "New chat",
    mode: modeSelect.value,
    messages: [],
    createdAt: Date.now(),
  };

  chats.unshift(chat);
  activeChatId = chat.id;
  saveChats();
  return chat;
}

function addMessage(role, content) {
  const chat = ensureChat(content);
  chat.messages.push({ role, content, ts: Date.now() });

  if (chat.messages.length === 1 && role === "user") {
    chat.title = content.slice(0, 36) || "New chat";
  }

  chat.mode = modeSelect.value;
  saveChats();
  renderChatList();
  renderMessages();
}

function fakeAssistantReply(userText) {
  const mode = modeSelect.value;
  const modeLabel = mode[0].toUpperCase() + mode.slice(1);

  return `Firebase login is connected now.

You said: "${userText}"

Current mode: ${modeLabel}

Next step: connect the secure APO AI backend so this becomes a real AI response instead of this demo message.`;
}

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  addMessage("user", text);
  messageInput.value = "";
  autoResize();

  sendBtn.disabled = true;

  setTimeout(() => {
    addMessage("assistant", fakeAssistantReply(text));
    sendBtn.disabled = false;
  }, 350);
}

function openAuth(mode = "login") {
  if (currentUser) {
    const label = currentUser.displayName || currentUser.email || "Account";
    const shouldLogout = confirm(`Signed in as ${label}.\n\nLog out?`);
    if (shouldLogout) doLogout();
    return;
  }

  authMode = mode;
  updateAuthUI();
  authModal.classList.remove("hidden");
}

function updateAuthUI() {
  const isLogin = authMode === "login";

  authTitle.textContent = isLogin ? "Welcome back" : "Create your account";
  authSubtitle.textContent = isLogin
    ? "Log in to save chats and sync your account."
    : "Sign up with email or Google.";
  authSubmit.textContent = isLogin ? "Log in" : "Create account";
  switchAuthMode.textContent = isLogin
    ? "Don't have an account? Sign up"
    : "Already have an account? Log in";
}

function closeModal(el) {
  el.classList.add("hidden");
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readableAuthError(error) {
  const code = error?.code || "";

  const messages = {
    "auth/email-already-in-use": "That email already has an account.",
    "auth/invalid-email": "That email address is not valid.",
    "auth/weak-password": "Use a password with at least 6 characters.",
    "auth/invalid-credential": "Wrong email or password.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/popup-closed-by-user": "Google sign-in was closed before finishing.",
    "auth/popup-blocked": "Your browser blocked the Google sign-in popup.",
    "auth/unauthorized-domain": "This website domain is not authorized in Firebase Authentication.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
  };

  return messages[code] || error?.message || "Authentication failed. Try again.";
}

function setAuthBusy(busy) {
  authSubmit.disabled = busy;
  googleBtn.disabled = busy;
  authSubmit.textContent = busy
    ? "Please wait..."
    : authMode === "login"
      ? "Log in"
      : "Create account";
}

function updateSignedInUI(user) {
  currentUser = user;

  if (user) {
    const label = user.displayName || user.email?.split("@")[0] || "Account";
    loginBtn.textContent = label;
    topLoginBtn.textContent = label;
    signupBtn.style.display = "none";
  } else {
    loginBtn.textContent = "Log in";
    topLoginBtn.textContent = "Log in";
    signupBtn.style.display = "";
  }
}

async function doLogout() {
  try {
    await signOut(auth);
  } catch (error) {
    alert(readableAuthError(error));
  }
}

messageInput.addEventListener("input", autoResize);

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener("click", sendMessage);

modeSelect.addEventListener("change", updateModeUI);

settingsModeSelect.addEventListener("change", () => {
  modeSelect.value = settingsModeSelect.value;
  updateModeUI();
});

menuBtn.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

newChatBtn.addEventListener("click", newChat);

document.querySelectorAll(".suggestion-card").forEach((card) => {
  card.addEventListener("click", () => {
    messageInput.value = card.dataset.prompt || "";
    autoResize();
    messageInput.focus();
  });
});

loginBtn.addEventListener("click", () => openAuth("login"));
topLoginBtn.addEventListener("click", () => openAuth("login"));
signupBtn.addEventListener("click", () => openAuth("signup"));
authClose.addEventListener("click", () => closeModal(authModal));

switchAuthMode.addEventListener("click", () => {
  authMode = authMode === "login" ? "signup" : "login";
  updateAuthUI();
});

authModal.addEventListener("click", (e) => {
  if (e.target === authModal) closeModal(authModal);
});

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  setAuthBusy(true);

  try {
    if (authMode === "signup") {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const defaultName = email.split("@")[0].slice(0, 32);

      try {
        await updateProfile(result.user, { displayName: defaultName });
      } catch (_) {}

      alert("Account created. You're signed in.");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }

    authForm.reset();
    closeModal(authModal);
  } catch (error) {
    alert(readableAuthError(error));
  } finally {
    setAuthBusy(false);
  }
});

googleBtn.addEventListener("click", async () => {
  setAuthBusy(true);

  try {
    await signInWithPopup(auth, googleProvider);
    closeModal(authModal);
  } catch (error) {
    alert(readableAuthError(error));
  } finally {
    setAuthBusy(false);
  }
});

settingsBtn.addEventListener("click", () => {
  settingsModal.classList.remove("hidden");
});

settingsClose.addEventListener("click", () => closeModal(settingsModal));

settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) closeModal(settingsModal);
});

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
  const light = document.body.classList.contains("light");
  themeToggle.textContent = light ? "Dark mode" : "Light mode";
  localStorage.setItem("apo_ai_theme", light ? "light" : "dark");
});

$("attachBtn").addEventListener("click", () => {
  alert("File uploads will be added after the AI backend is connected.");
});

onAuthStateChanged(auth, (user) => {
  updateSignedInUI(user);
});

const savedMode = localStorage.getItem("apo_ai_mode");
if (savedMode && modeDescriptions[savedMode]) {
  modeSelect.value = savedMode;
}

if (localStorage.getItem("apo_ai_theme") === "light") {
  document.body.classList.add("light");
  themeToggle.textContent = "Dark mode";
}

updateModeUI();
renderChatList();
renderMessages();
autoResize();
