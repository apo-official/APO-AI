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
const sidebarOverlay = $("sidebarOverlay");
const menuBtn = $("menuBtn");
const brandBtn = $("brandBtn");
const newChatBtn = $("newChatBtn");
const chatList = $("chatList");
const chatScroll = $("chatScroll");
const hero = $("hero");
const messages = $("messages");
const messageInput = $("messageInput");
const sendBtn = $("sendBtn");

const modeSelect = $("modeSelect");
const modeLock = $("modeLock");
const modeHint = $("modeHint");
const settingsModeSelect = $("settingsModeSelect");
const settingsModeText = $("settingsModeText");

const signupBtn = $("signupBtn");
const loginBtn = $("loginBtn");
const accountBtn = $("accountBtn");

const authModal = $("authModal");
const authClose = $("authClose");
const authTitle = $("authTitle");
const authSubtitle = $("authSubtitle");
const authForm = $("authForm");
const emailInput = $("emailInput");
const passwordInput = $("passwordInput");
const authSubmit = $("authSubmit");
const googleBtn = $("googleBtn");
const switchAuthMode = $("switchAuthMode");

const settingsModal = $("settingsModal");
const settingsBtn = $("settingsBtn");
const settingsClose = $("settingsClose");
const themeToggle = $("themeToggle");

let authMode = "login";
let currentUser = null;
let activeChatId = null;
let chats = readChats();

const modeDescriptions = {
  fast: "Fast • quickest replies",
  medium: "Medium • balanced reasoning",
  high: "High • deeper reasoning"
};

function readChats() {
  try {
    return JSON.parse(localStorage.getItem("apo_ai_chats") || "[]");
  } catch {
    return [];
  }
}

function saveChats() {
  localStorage.setItem("apo_ai_chats", JSON.stringify(chats));
}

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function autoResize() {
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight, 180) + "px";
}

function openSidebar() {
  sidebar.classList.add("open");
  sidebarOverlay.classList.add("open");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("open");
}

function openModal(modal) {
  modal.classList.remove("hidden");
}

function closeModal(modal) {
  modal.classList.add("hidden");
}

function setModeAccess(user) {
  const signedIn = Boolean(user);

  modeSelect.disabled = !signedIn;
  settingsModeSelect.disabled = !signedIn;
  modeLock.classList.toggle("hidden", signedIn);

  if (signedIn) {
    const savedMode = localStorage.getItem("apo_ai_mode");
    modeSelect.value = savedMode && modeDescriptions[savedMode] ? savedMode : "medium";
  } else {
    modeSelect.value = "medium";
  }

  settingsModeSelect.value = modeSelect.value;
  modeHint.textContent = signedIn
    ? modeDescriptions[modeSelect.value]
    : "Medium • sign in to change";

  settingsModeText.textContent = signedIn
    ? "Used when a new chat starts."
    : "Sign in to change AI mode.";

  $("heroSubtitle").textContent = signedIn
    ? "Choose a mode and start a conversation."
    : "Sign in to unlock Fast, Medium, and High modes.";
}

function updateMode() {
  if (!currentUser) {
    openAuth("login");
    return;
  }

  localStorage.setItem("apo_ai_mode", modeSelect.value);
  settingsModeSelect.value = modeSelect.value;
  modeHint.textContent = modeDescriptions[modeSelect.value];
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
    const button = document.createElement("button");
    button.className = "chat-item" + (chat.id === activeChatId ? " active" : "");
    button.type = "button";
    button.innerHTML = `<span class="chat-title">${escapeHtml(chat.title)}</span>`;

    button.addEventListener("click", () => {
      activeChatId = chat.id;
      renderAll();
      closeSidebar();
    });

    chatList.appendChild(button);
  });
}

function renderMessages() {
  messages.innerHTML = "";

  const chat = chats.find((item) => item.id === activeChatId);

  if (!chat || !chat.messages.length) {
    hero.classList.remove("hidden");
    return;
  }

  hero.classList.add("hidden");

  for (const msg of chat.messages) {
    const row = document.createElement("div");
    row.className = `message ${msg.role}`;

    if (msg.role === "assistant") {
      const avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.innerHTML = '<img src="apo-logo.jpg" alt="APO">';
      row.appendChild(avatar);
    }

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = msg.content;
    row.appendChild(bubble);

    messages.appendChild(row);
  }

  requestAnimationFrame(() => {
    chatScroll.scrollTop = chatScroll.scrollHeight;
  });
}

function renderAll() {
  renderChatList();
  renderMessages();
}

function createChat(firstMessage) {
  const chat = {
    id: makeId(),
    title: firstMessage.slice(0, 36) || "New chat",
    mode: modeSelect.value,
    createdAt: Date.now(),
    messages: []
  };

  chats.unshift(chat);
  activeChatId = chat.id;
  return chat;
}

function getActiveChat(firstMessage = "") {
  let chat = chats.find((item) => item.id === activeChatId);

  if (!chat) {
    chat = createChat(firstMessage);
  }

  return chat;
}

function addMessage(role, content) {
  const chat = getActiveChat(content);

  chat.messages.push({
    role,
    content,
    ts: Date.now()
  });

  if (chat.messages.length === 1 && role === "user") {
    chat.title = content.slice(0, 36) || "New chat";
  }

  chat.mode = modeSelect.value;

  saveChats();
  renderAll();
}

function demoAssistantReply(userText) {
  const modeName = modeSelect.value[0].toUpperCase() + modeSelect.value.slice(1);

  return `You said: "${userText}"

Current mode: ${modeName}

APO AI's secure backend is the next step. The website UI and Firebase login are working, but this reply is still a demo response.`;
}

function sendMessage() {
  const text = messageInput.value.trim();

  if (!text) return;

  addMessage("user", text);

  messageInput.value = "";
  autoResize();

  sendBtn.disabled = true;

  window.setTimeout(() => {
    addMessage("assistant", demoAssistantReply(text));
    sendBtn.disabled = false;
  }, 250);
}

function updateAuthUI() {
  const isLogin = authMode === "login";

  authTitle.textContent = isLogin ? "Welcome back" : "Create your account";
  authSubtitle.textContent = isLogin
    ? "Log in to unlock AI modes."
    : "Sign up with email or Google to unlock AI modes.";

  authSubmit.textContent = isLogin ? "Log in" : "Create account";

  switchAuthMode.textContent = isLogin
    ? "Don't have an account? Sign up"
    : "Already have an account? Log in";

  passwordInput.autocomplete = isLogin ? "current-password" : "new-password";
}

function openAuth(mode = "login") {
  if (currentUser) {
    const label = currentUser.displayName || currentUser.email || "Account";
    const shouldLogout = confirm(`Signed in as ${label}.\n\nLog out?`);

    if (shouldLogout) {
      signOut(auth);
    }

    return;
  }

  authMode = mode;
  updateAuthUI();
  openModal(authModal);
}

function authErrorMessage(error) {
  const map = {
    "auth/email-already-in-use": "That email already has an account.",
    "auth/invalid-email": "That email address is not valid.",
    "auth/weak-password": "Use a password with at least 6 characters.",
    "auth/invalid-credential": "Wrong email or password.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/popup-closed-by-user": "Google sign-in was closed before finishing.",
    "auth/popup-blocked": "Your browser blocked the Google sign-in popup.",
    "auth/unauthorized-domain": "Add apo-official.github.io to Firebase Authentication → Settings → Authorized domains.",
    "auth/network-request-failed": "Network error. Check your connection and try again."
  };

  return map[error?.code] || error?.message || "Authentication failed. Try again.";
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

function updateAccountUI(user) {
  currentUser = user;
  setModeAccess(user);

  if (user) {
    const label = user.displayName || user.email?.split("@")[0] || "Account";

    loginBtn.textContent = label;
    accountBtn.textContent = label;
    signupBtn.style.display = "none";
  } else {
    loginBtn.textContent = "Log in";
    accountBtn.textContent = "Log in";
    signupBtn.style.display = "";
  }
}

menuBtn.addEventListener("click", () => {
  if (sidebar.classList.contains("open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
});

sidebarOverlay.addEventListener("click", closeSidebar);

brandBtn.addEventListener("click", () => {
  activeChatId = null;
  renderAll();
  closeSidebar();
});

newChatBtn.addEventListener("click", () => {
  activeChatId = null;
  renderAll();
  closeSidebar();
  messageInput.focus();
});

document.querySelectorAll(".suggestion").forEach((button) => {
  button.addEventListener("click", () => {
    messageInput.value = button.dataset.prompt || "";
    autoResize();
    messageInput.focus();
  });
});

messageInput.addEventListener("input", autoResize);

messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener("click", sendMessage);

modeSelect.addEventListener("change", updateMode);

settingsModeSelect.addEventListener("change", () => {
  if (!currentUser) {
    openAuth("login");
    return;
  }

  modeSelect.value = settingsModeSelect.value;
  updateMode();
});

modeLock.addEventListener("click", () => openAuth("login"));

loginBtn.addEventListener("click", () => openAuth("login"));

signupBtn.addEventListener("click", () => openAuth("signup"));

accountBtn.addEventListener("click", () => {
  closeSidebar();
  openAuth("login");
});

authClose.addEventListener("click", () => closeModal(authModal));

authModal.addEventListener("click", (event) => {
  if (event.target === authModal) {
    closeModal(authModal);
  }
});

switchAuthMode.addEventListener("click", () => {
  authMode = authMode === "login" ? "signup" : "login";
  updateAuthUI();
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  setAuthBusy(true);

  try {
    if (authMode === "signup") {
      const result = await createUserWithEmailAndPassword(auth, email, password);

      try {
        await updateProfile(result.user, {
          displayName: email.split("@")[0].slice(0, 32)
        });
      } catch {}
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }

    authForm.reset();
    closeModal(authModal);
  } catch (error) {
    alert(authErrorMessage(error));
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
    alert(authErrorMessage(error));
  } finally {
    setAuthBusy(false);
  }
});

settingsBtn.addEventListener("click", () => {
  closeSidebar();
  openModal(settingsModal);
});

settingsClose.addEventListener("click", () => closeModal(settingsModal));

settingsModal.addEventListener("click", (event) => {
  if (event.target === settingsModal) {
    closeModal(settingsModal);
  }
});

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");

  const light = document.body.classList.contains("light");
  themeToggle.textContent = light ? "Dark mode" : "Light mode";

  localStorage.setItem("apo_ai_theme", light ? "light" : "dark");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSidebar();
    closeModal(authModal);
    closeModal(settingsModal);
  }
});

onAuthStateChanged(auth, (user) => {
  updateAccountUI(user);
});

if (localStorage.getItem("apo_ai_theme") === "light") {
  document.body.classList.add("light");
  themeToggle.textContent = "Dark mode";
}

setModeAccess(null);
renderAll();
autoResize();
