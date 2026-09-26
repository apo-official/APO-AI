import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  reload
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

const OWNER_EMAIL = "dachivasadze18@gmail.com";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const $ = (id) => document.getElementById(id);

const sidebar = $("sidebar");
const sidebarOverlay = $("sidebarOverlay");
const chatList = $("chatList");
const hero = $("hero");
const messages = $("messages");
const chatScroll = $("chatScroll");
const messageInput = $("messageInput");
const modeSelect = $("modeSelect");
const settingsModeSelect = $("settingsModeSelect");

let currentUser = null;
let authMode = "login";
let activeChatId = null;
let chats = readJSON("apo_ai_chats", []);
let pendingAttachments = [];

let mediaRecorder = null;
let recordedChunks = [];
let recordingStartedAt = 0;
let recordingTimer = null;

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function saveChats() {
  localStorage.setItem("apo_ai_chats", JSON.stringify(chats));
}

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function autoResize() {
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight, 160) + "px";
}

function openSidebar() {
  sidebar.classList.add("open");
  sidebarOverlay.classList.add("open");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("open");
}

function openModal(el) {
  el.classList.remove("hidden");
}

function closeModal(el) {
  el.classList.add("hidden");
}

function isOwner(user = currentUser) {
  return Boolean(user?.email && user.email.toLowerCase() === OWNER_EMAIL.toLowerCase());
}

function renderChatList() {
  chatList.innerHTML = "";

  if (!chats.length) {
    chatList.innerHTML = '<div class="sidebar-label">No chats yet</div>';
    return;
  }

  chats.forEach((chat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chat-item" + (chat.id === activeChatId ? " active" : "");
    btn.innerHTML = `<span class="chat-title">${escapeHtml(chat.title)}</span>`;
    btn.onclick = () => {
      activeChatId = chat.id;
      renderAll();
      closeSidebar();
    };
    chatList.appendChild(btn);
  });
}

function renderMessages() {
  messages.innerHTML = "";
  const chat = chats.find(c => c.id === activeChatId);

  if (!chat || !chat.messages.length) {
    hero.classList.remove("hidden");
    return;
  }

  hero.classList.add("hidden");

  for (const msg of chat.messages) {
    const row = document.createElement("div");
    row.className = `message ${msg.role}`;

    if (msg.role === "assistant") {
      const avatar = document.createElement("img");
      avatar.className = "message-avatar";
      avatar.src = "apo-logo.jpg";
      avatar.alt = "APO";
      row.appendChild(avatar);
    }

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    if (msg.content) {
      const text = document.createElement("div");
      text.textContent = msg.content;
      bubble.appendChild(text);
    }

    for (const attachment of msg.attachments || []) {
      if (attachment.kind === "image") {
        const img = document.createElement("img");
        img.className = "message-attachment";
        img.src = attachment.dataUrl;
        img.alt = attachment.name || "Image";
        bubble.appendChild(img);
      } else if (attachment.kind === "voice") {
        const wrap = document.createElement("div");
        wrap.className = "voice-chip";
        const audio = document.createElement("audio");
        audio.controls = true;
        audio.src = attachment.dataUrl;
        wrap.append("🎙 Voice message ");
        wrap.appendChild(audio);
        bubble.appendChild(wrap);
      } else {
        const chip = document.createElement("div");
        chip.className = "file-chip";
        chip.textContent = `📎 ${attachment.name || "File"}`;
        bubble.appendChild(chip);
      }
    }

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

function ensureChat(seed = "") {
  let chat = chats.find(c => c.id === activeChatId);
  if (chat) return chat;

  chat = {
    id: makeId(),
    title: seed.slice(0, 36) || "New chat",
    createdAt: Date.now(),
    mode: modeSelect.value,
    messages: []
  };
  chats.unshift(chat);
  activeChatId = chat.id;
  return chat;
}

function addMessage(role, content, attachments = []) {
  const chat = ensureChat(content || attachments[0]?.name || "New chat");
  chat.messages.push({ role, content, attachments, ts: Date.now() });
  if (chat.messages.length === 1 && role === "user") {
    chat.title = (content || attachments[0]?.name || "New chat").slice(0, 36);
  }
  chat.mode = modeSelect.value;
  saveChats();
  renderAll();
}

function demoReply(text, attachments) {
  const pieces = [];
  if (text) pieces.push(`You said: "${text}"`);
  if (attachments?.length) pieces.push(`You attached ${attachments.length} item${attachments.length === 1 ? "" : "s"}.`);
  pieces.push(`Mode: ${modeSelect.value}`);
  pieces.push("The real APO AI backend is the next step; this is still a frontend demo reply.");
  return pieces.join("\\n\\n");
}

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text && !pendingAttachments.length) return;

  const attachments = pendingAttachments.map(a => ({...a}));
  addMessage("user", text, attachments);

  messageInput.value = "";
  pendingAttachments = [];
  renderAttachmentPreview();
  autoResize();

  $("sendBtn").disabled = true;
  setTimeout(() => {
    addMessage("assistant", demoReply(text, attachments));
    $("sendBtn").disabled = false;
  }, 220);
}

function setModeAccess(user) {
  const signedIn = Boolean(user);
  modeSelect.disabled = !signedIn;
  settingsModeSelect.disabled = !signedIn;
  $("modeLock").classList.toggle("hidden", signedIn);

  if (signedIn) {
    const saved = localStorage.getItem("apo_ai_mode");
    modeSelect.value = ["fast","medium","high"].includes(saved) ? saved : "medium";
  } else {
    modeSelect.value = "medium";
  }

  settingsModeSelect.value = modeSelect.value;
  $("modeHint").textContent = signedIn
    ? `${modeSelect.value[0].toUpperCase() + modeSelect.value.slice(1)} mode`
    : "Medium • sign in to change";

  $("heroSubtitle").textContent = signedIn
    ? "Choose a mode and start a conversation."
    : "Sign in to unlock all APO AI modes.";
}

function updateMode() {
  if (!currentUser) {
    openAuth("login");
    return;
  }
  localStorage.setItem("apo_ai_mode", modeSelect.value);
  settingsModeSelect.value = modeSelect.value;
  $("modeHint").textContent = `${modeSelect.value[0].toUpperCase() + modeSelect.value.slice(1)} mode`;
}

function updateAccountUI(user) {
  currentUser = user;
  setModeAccess(user);

  if (user) {
    const name = user.displayName || user.email?.split("@")[0] || "Account";
    $("loginBtn").textContent = name;
    $("accountBtn").textContent = name;
    $("signupBtn").classList.add("hidden");
    $("settingsAccountName").textContent = name;
    $("settingsAccountEmail").textContent = user.email || "";
    $("accountAvatar").textContent = name.slice(0,1).toUpperCase();
    $("verificationStatus").textContent = user.emailVerified ? "Verified" : "Not verified";
    $("verifyFromSettingsBtn").classList.toggle("hidden", user.emailVerified);
    $("logoutBtn").classList.remove("hidden");

    $("ownerTabBtn").classList.toggle("hidden", !isOwner(user));
  } else {
    $("loginBtn").textContent = "Log in";
    $("accountBtn").textContent = "Log in";
    $("signupBtn").classList.remove("hidden");
    $("settingsAccountName").textContent = "Not signed in";
    $("settingsAccountEmail").textContent = "Sign in to sync your account.";
    $("accountAvatar").textContent = "A";
    $("verificationStatus").textContent = "Not signed in";
    $("verifyFromSettingsBtn").classList.add("hidden");
    $("logoutBtn").classList.add("hidden");
    $("ownerTabBtn").classList.add("hidden");
  }
}

function updateAuthUI() {
  const signup = authMode === "signup";
  $("authTitle").textContent = signup ? "Create your account" : "Welcome back";
  $("authSubtitle").textContent = signup
    ? "Choose a display name and create your APO AI account."
    : "Log in to continue to APO AI.";
  $("authSubmit").textContent = signup ? "Create account" : "Log in";
  $("displayNameWrap").classList.toggle("hidden", !signup);
  $("displayNameInput").required = signup;
  $("passwordInput").autocomplete = signup ? "new-password" : "current-password";
  $("switchAuthMode").textContent = signup
    ? "Already have an account? Log in"
    : "Don't have an account? Sign up";
  $("verifyBox").classList.add("hidden");
}

function openAuth(mode = "login") {
  if (currentUser) {
    $("settingsBtn").click();
    return;
  }
  authMode = mode;
  updateAuthUI();
  openModal($("authModal"));
}

function authError(error) {
  const map = {
    "auth/email-already-in-use": "That email already has an account.",
    "auth/invalid-email": "That email address is not valid.",
    "auth/weak-password": "Use a password with at least 6 characters.",
    "auth/invalid-credential": "Wrong email or password.",
    "auth/popup-closed-by-user": "Google sign-in was closed before finishing.",
    "auth/popup-blocked": "Your browser blocked the Google sign-in popup.",
    "auth/unauthorized-domain": "Add apo-official.github.io to Firebase Authentication → Settings → Authorized domains.",
    "auth/network-request-failed": "Network error. Check your connection and try again."
  };
  return map[error?.code] || error?.message || "Authentication failed.";
}

function setAuthBusy(busy) {
  $("authSubmit").disabled = busy;
  $("googleBtn").disabled = busy;
  $("authSubmit").textContent = busy
    ? "Please wait..."
    : authMode === "signup" ? "Create account" : "Log in";
}

async function sendVerification(user = auth.currentUser) {
  if (!user) return;
  await sendEmailVerification(user);
  $("verifyBox").classList.remove("hidden");
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

async function addFiles(files, source = "file") {
  for (const file of Array.from(files)) {
    const isImage = file.type.startsWith("image/");
    const dataUrl = await fileToDataUrl(file);
    pendingAttachments.push({
      id: makeId(),
      kind: isImage ? "image" : "file",
      name: file.name,
      type: file.type,
      size: file.size,
      source,
      dataUrl
    });
  }
  renderAttachmentPreview();
}

function renderAttachmentPreview() {
  const strip = $("attachmentPreview");
  strip.innerHTML = "";

  if (!pendingAttachments.length) {
    strip.classList.add("hidden");
    return;
  }

  strip.classList.remove("hidden");

  pendingAttachments.forEach((att) => {
    const item = document.createElement("div");
    item.className = "preview-item";

    if (att.kind === "image") {
      const img = document.createElement("img");
      img.src = att.dataUrl;
      img.alt = att.name;
      item.appendChild(img);
    } else if (att.kind === "voice") {
      const label = document.createElement("div");
      label.className = "preview-file";
      label.textContent = "🎙 Voice message";
      item.appendChild(label);
    } else {
      const label = document.createElement("div");
      label.className = "preview-file";
      label.textContent = `📎 ${att.name}`;
      item.appendChild(label);
    }

    const remove = document.createElement("button");
    remove.className = "preview-remove";
    remove.type = "button";
    remove.textContent = "×";
    remove.onclick = () => {
      pendingAttachments = pendingAttachments.filter(x => x.id !== att.id);
      renderAttachmentPreview();
    };
    item.appendChild(remove);
    strip.appendChild(item);
  });
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    alert("Voice recording is not supported in this browser.");
    return;
  }

  if (isOwner() && !$("ownerVoiceToggle").checked) {
    alert("Voice recording is disabled in Owner Controls.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      clearInterval(recordingTimer);
      $("recordingToast").classList.add("hidden");
      $("micBtn").classList.remove("recording");

      const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || "audio/webm" });
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
      const dataUrl = await fileToDataUrl(file);

      pendingAttachments.push({
        id: makeId(),
        kind: "voice",
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl
      });

      stream.getTracks().forEach(t => t.stop());
      renderAttachmentPreview();
    };

    mediaRecorder.start();
    recordingStartedAt = Date.now();
    $("recordingToast").classList.remove("hidden");
    $("micBtn").classList.add("recording");

    const tick = () => {
      const seconds = Math.floor((Date.now() - recordingStartedAt) / 1000);
      const m = Math.floor(seconds / 60);
      const s = String(seconds % 60).padStart(2, "0");
      $("recordingTime").textContent = `Recording ${m}:${s}`;
    };
    tick();
    recordingTimer = setInterval(tick, 500);
  } catch (error) {
    alert("Microphone permission was blocked or unavailable.");
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
}

function switchSettingsTab(name) {
  document.querySelectorAll(".settings-tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === name);
  });
  document.querySelectorAll(".settings-panel").forEach(panel => {
    panel.classList.toggle("active", panel.dataset.panel === name);
  });
}

function loadOwnerSettings() {
  const owner = readJSON("apo_owner_settings", {
    systemPrompt: "You are APO AI. Be helpful, clear, and concise.",
    images: true,
    voice: true,
    maintenance: false
  });
  $("ownerSystemPrompt").value = owner.systemPrompt || "";
  $("ownerImagesToggle").checked = owner.images !== false;
  $("ownerVoiceToggle").checked = owner.voice !== false;
  $("ownerMaintenanceToggle").checked = owner.maintenance === true;
}

$("menuBtn").onclick = () => sidebar.classList.contains("open") ? closeSidebar() : openSidebar();
sidebarOverlay.onclick = closeSidebar;

$("homeBtn").onclick = () => {
  activeChatId = null;
  renderAll();
  closeSidebar();
};

$("newChatBtn").onclick = () => {
  activeChatId = null;
  renderAll();
  closeSidebar();
  messageInput.focus();
};

document.querySelectorAll(".suggestion").forEach(btn => {
  btn.onclick = () => {
    messageInput.value = btn.dataset.prompt || "";
    autoResize();
    messageInput.focus();
  };
});

messageInput.addEventListener("input", autoResize);
messageInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
$("sendBtn").onclick = sendMessage;

modeSelect.onchange = updateMode;
settingsModeSelect.onchange = () => {
  modeSelect.value = settingsModeSelect.value;
  updateMode();
};
$("modeLock").onclick = () => openAuth("login");

$("plusBtn").onclick = (e) => {
  e.stopPropagation();
  $("plusMenu").classList.toggle("hidden");
};

document.addEventListener("click", e => {
  if (!e.target.closest(".plus-wrap")) $("plusMenu").classList.add("hidden");
});

$("cameraBtn").onclick = () => {
  $("plusMenu").classList.add("hidden");
  $("cameraInput").click();
};
$("photosBtn").onclick = () => {
  $("plusMenu").classList.add("hidden");
  $("photosInput").click();
};
$("filesBtn").onclick = () => {
  $("plusMenu").classList.add("hidden");
  $("filesInput").click();
};

$("cameraInput").onchange = e => addFiles(e.target.files, "camera");
$("photosInput").onchange = e => addFiles(e.target.files, "photos");
$("filesInput").onchange = e => addFiles(e.target.files, "files");

$("micBtn").onclick = () => {
  if (mediaRecorder && mediaRecorder.state === "recording") stopRecording();
  else startRecording();
};
$("stopRecordingBtn").onclick = stopRecording;

$("signupBtn").onclick = () => openAuth("signup");
$("loginBtn").onclick = () => openAuth("login");
$("accountBtn").onclick = () => {
  closeSidebar();
  if (currentUser) {
    $("settingsBtn").click();
    switchSettingsTab("account");
  } else {
    openAuth("login");
  }
};

$("authClose").onclick = () => closeModal($("authModal"));
$("switchAuthMode").onclick = () => {
  authMode = authMode === "login" ? "signup" : "login";
  updateAuthUI();
};
$("authModal").onclick = e => {
  if (e.target === $("authModal")) closeModal($("authModal"));
};

$("authForm").onsubmit = async e => {
  e.preventDefault();
  setAuthBusy(true);

  try {
    const email = $("emailInput").value.trim();
    const password = $("passwordInput").value;

    if (authMode === "signup") {
      const displayName = $("displayNameInput").value.trim();
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
      await sendVerification(result.user);
      $("verifyBox").classList.remove("hidden");
    } else {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (!result.user.emailVerified) {
        $("verifyBox").classList.remove("hidden");
      } else {
        closeModal($("authModal"));
      }
    }
  } catch (error) {
    alert(authError(error));
  } finally {
    setAuthBusy(false);
  }
};

$("googleBtn").onclick = async () => {
  setAuthBusy(true);
  try {
    const result = await signInWithPopup(auth, googleProvider);
    closeModal($("authModal"));
    updateAccountUI(result.user);
  } catch (error) {
    alert(authError(error));
  } finally {
    setAuthBusy(false);
  }
};

$("resendVerifyBtn").onclick = async () => {
  try {
    await sendVerification(auth.currentUser);
    alert("Verification email sent again.");
  } catch (error) {
    alert(authError(error));
  }
};

$("checkVerifyBtn").onclick = async () => {
  if (!auth.currentUser) return;
  await reload(auth.currentUser);
  if (auth.currentUser.emailVerified) {
    closeModal($("authModal"));
    updateAccountUI(auth.currentUser);
  } else {
    alert("Your email is still not verified yet.");
  }
};

$("settingsBtn").onclick = () => {
  closeSidebar();
  loadOwnerSettings();
  openModal($("settingsModal"));
};
$("settingsClose").onclick = () => closeModal($("settingsModal"));
$("settingsModal").onclick = e => {
  if (e.target === $("settingsModal")) closeModal($("settingsModal"));
};

document.querySelectorAll(".settings-tab").forEach(btn => {
  btn.onclick = () => switchSettingsTab(btn.dataset.tab);
});

$("themeToggle").onclick = () => {
  document.body.classList.toggle("light");
  const light = document.body.classList.contains("light");
  $("themeToggle").textContent = light ? "Dark mode" : "Light mode";
  localStorage.setItem("apo_ai_theme", light ? "light" : "dark");
};

$("clearChatsBtn").onclick = () => {
  if (!confirm("Clear all chats saved on this device?")) return;
  chats = [];
  activeChatId = null;
  saveChats();
  renderAll();
};

$("verifyFromSettingsBtn").onclick = () => {
  closeModal($("settingsModal"));
  openModal($("authModal"));
  $("verifyBox").classList.remove("hidden");
};

$("logoutBtn").onclick = async () => {
  await signOut(auth);
  closeModal($("settingsModal"));
};

$("saveOwnerBtn").onclick = () => {
  if (!isOwner()) {
    alert("Owner access required.");
    return;
  }

  const settings = {
    systemPrompt: $("ownerSystemPrompt").value.trim(),
    images: $("ownerImagesToggle").checked,
    voice: $("ownerVoiceToggle").checked,
    maintenance: $("ownerMaintenanceToggle").checked
  };

  localStorage.setItem("apo_owner_settings", JSON.stringify(settings));
  alert("Owner settings saved on this device. Backend enforcement comes next.");
};

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeSidebar();
    closeModal($("authModal"));
    closeModal($("settingsModal"));
    $("plusMenu").classList.add("hidden");
  }
});

onAuthStateChanged(auth, user => {
  updateAccountUI(user);
});

if (localStorage.getItem("apo_ai_theme") === "light") {
  document.body.classList.add("light");
  $("themeToggle").textContent = "Dark mode";
}

loadOwnerSettings();
setModeAccess(null);
renderAll();
autoResize();
