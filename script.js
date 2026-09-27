import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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

googleProvider.setCustomParameters({
  prompt: "select_account"
});

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


/* =========================
   STORAGE
========================= */

function readJSON(key, fallback) {
  try {
    return JSON.parse(
      localStorage.getItem(key) ||
      JSON.stringify(fallback)
    );
  } catch {
    return fallback;
  }
}

function saveChats() {
  localStorage.setItem(
    "apo_ai_chats",
    JSON.stringify(chats)
  );
}

function makeId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}


/* =========================
   BASIC UI
========================= */

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function autoResize() {
  if (!messageInput) return;

  messageInput.style.height = "auto";

  messageInput.style.height =
    Math.min(
      messageInput.scrollHeight,
      160
    ) + "px";
}

function openSidebar() {
  sidebar?.classList.add("open");
  sidebarOverlay?.classList.add("open");
}

function closeSidebar() {
  sidebar?.classList.remove("open");
  sidebarOverlay?.classList.remove("open");
}

function openModal(element) {
  element?.classList.remove("hidden");
}

function closeModal(element) {
  element?.classList.add("hidden");
}


/* =========================
   OWNER
========================= */

function isOwner(user = currentUser) {
  return Boolean(
    user?.email &&
    user.email.toLowerCase() ===
      OWNER_EMAIL.toLowerCase()
  );
}

function isGoogleUser(user) {
  return Boolean(
    user?.providerData?.some(
      provider =>
        provider.providerId === "google.com"
    )
  );
}

function canUseAccountFeatures(user) {
  if (!user) {
    return false;
  }

  return (
    isGoogleUser(user) ||
    user.emailVerified
  );
}


/* =========================
   CHAT LIST
========================= */

function renderChatList() {
  if (!chatList) return;

  chatList.innerHTML = "";

  if (!chats.length) {
    chatList.innerHTML =
      '<div class="sidebar-label">No chats yet</div>';

    return;
  }

  chats.forEach(chat => {
    const button =
      document.createElement("button");

    button.type = "button";

    button.className =
      "chat-item" +
      (
        chat.id === activeChatId
          ? " active"
          : ""
      );

    button.innerHTML =
      `<span class="chat-title">${escapeHtml(
        chat.title
      )}</span>`;

    button.onclick = () => {
      activeChatId = chat.id;

      renderAll();
      closeSidebar();
    };

    chatList.appendChild(button);
  });
}


/* =========================
   MESSAGES
========================= */

function renderMessages() {
  if (!messages) return;

  messages.innerHTML = "";

  const chat =
    chats.find(
      chat =>
        chat.id === activeChatId
    );

  if (
    !chat ||
    !chat.messages.length
  ) {
    hero?.classList.remove("hidden");
    return;
  }

  hero?.classList.add("hidden");

  for (const msg of chat.messages) {
    const row =
      document.createElement("div");

    row.className =
      `message ${msg.role}`;

    if (
      msg.role === "assistant"
    ) {
      const avatar =
        document.createElement("img");

      avatar.className =
        "message-avatar";

      avatar.src =
        "apo-logo.jpg";

      avatar.alt =
        "APO";

      row.appendChild(avatar);
    }

    const bubble =
      document.createElement("div");

    bubble.className =
      "bubble";

    if (msg.content) {
      const text =
        document.createElement("div");

      text.textContent =
        msg.content;

      bubble.appendChild(text);
    }

    for (
      const attachment
      of msg.attachments || []
    ) {
      if (
        attachment.kind === "image"
      ) {
        const image =
          document.createElement("img");

        image.className =
          "message-attachment";

        image.src =
          attachment.dataUrl;

        image.alt =
          attachment.name ||
          "Image";

        bubble.appendChild(image);
      }

      else if (
        attachment.kind === "voice"
      ) {
        const voice =
          document.createElement("div");

        voice.className =
          "voice-chip";

        const audio =
          document.createElement("audio");

        audio.controls = true;
        audio.src =
          attachment.dataUrl;

        voice.append(
          "🎙 Voice message "
        );

        voice.appendChild(audio);

        bubble.appendChild(voice);
      }

      else {
        const file =
          document.createElement("div");

        file.className =
          "file-chip";

        file.textContent =
          `📎 ${
            attachment.name ||
            "File"
          }`;

        bubble.appendChild(file);
      }
    }

    row.appendChild(bubble);

    messages.appendChild(row);
  }

  requestAnimationFrame(() => {
    if (chatScroll) {
      chatScroll.scrollTop =
        chatScroll.scrollHeight;
    }
  });
}

function renderAll() {
  renderChatList();
  renderMessages();
}


/* =========================
   CREATE / SEND CHAT
========================= */

function ensureChat(seed = "") {
  let chat =
    chats.find(
      chat =>
        chat.id === activeChatId
    );

  if (chat) {
    return chat;
  }

  chat = {
    id: makeId(),

    title:
      seed.slice(0, 36) ||
      "New chat",

    createdAt:
      Date.now(),

    mode:
      modeSelect?.value ||
      "medium",

    messages: []
  };

  chats.unshift(chat);

  activeChatId =
    chat.id;

  return chat;
}

function addMessage(
  role,
  content,
  attachments = []
) {
  const chat =
    ensureChat(
      content ||
      attachments[0]?.name ||
      "New chat"
    );

  chat.messages.push({
    role,
    content,
    attachments,
    ts: Date.now()
  });

  if (
    chat.messages.length === 1 &&
    role === "user"
  ) {
    chat.title =
      (
        content ||
        attachments[0]?.name ||
        "New chat"
      ).slice(0, 36);
  }

  chat.mode =
    modeSelect?.value ||
    "medium";

  saveChats();

  renderAll();
}

function demoReply(
  text,
  attachments
) {
  const parts = [];

  if (text) {
    parts.push(
      `You said: "${text}"`
    );
  }

  if (
    attachments?.length
  ) {
    parts.push(
      `You attached ${
        attachments.length
      } item${
        attachments.length === 1
          ? ""
          : "s"
      }.`
    );
  }

  parts.push(
    `Mode: ${
      modeSelect?.value ||
      "medium"
    }`
  );

  parts.push(
    "The real APO AI backend is not connected yet."
  );

  return parts.join("\n\n");
}

function sendMessage() {
  const text =
    messageInput?.value
      .trim() || "";

  if (
    !text &&
    !pendingAttachments.length
  ) {
    return;
  }

  const attachments =
    pendingAttachments.map(
      attachment => ({
        ...attachment
      })
    );

  addMessage(
    "user",
    text,
    attachments
  );

  messageInput.value = "";

  pendingAttachments = [];

  renderAttachmentPreview();

  autoResize();

  if ($("sendBtn")) {
    $("sendBtn").disabled = true;
  }

  setTimeout(() => {
    addMessage(
      "assistant",
      demoReply(
        text,
        attachments
      )
    );

    if ($("sendBtn")) {
      $("sendBtn").disabled = false;
    }
  }, 250);
}


/* =========================
   MODES
========================= */

function setModeAccess(user) {
  const unlocked =
    canUseAccountFeatures(user);

  if (modeSelect) {
    modeSelect.disabled =
      !unlocked;
  }

  if (settingsModeSelect) {
    settingsModeSelect.disabled =
      !unlocked;
  }

  $("modeLock")
    ?.classList.toggle(
      "hidden",
      unlocked
    );

  if (unlocked) {
    const saved =
      localStorage.getItem(
        "apo_ai_mode"
      );

    if (
      [
        "fast",
        "medium",
        "high"
      ].includes(saved)
    ) {
      modeSelect.value = saved;
    } else {
      modeSelect.value =
        "medium";
    }
  }

  else if (modeSelect) {
    modeSelect.value =
      "medium";
  }

  if (
    settingsModeSelect &&
    modeSelect
  ) {
    settingsModeSelect.value =
      modeSelect.value;
  }

  if ($("modeHint")) {
    $("modeHint").textContent =
      unlocked
        ? `${
            modeSelect.value[0]
              .toUpperCase() +
            modeSelect.value.slice(1)
          } mode`
        : user
          ? "Verify email to unlock modes"
          : "Medium • sign in to change";
  }

  if ($("heroSubtitle")) {
    $("heroSubtitle").textContent =
      unlocked
        ? "Choose a mode and start a conversation."
        : user
          ? "Verify your email to unlock all APO AI modes."
          : "Sign in to unlock all APO AI modes.";
  }
}

function updateMode() {
  if (!currentUser) {
    openAuth("login");
    return;
  }

  if (
    !canUseAccountFeatures(
      currentUser
    )
  ) {
    alert(
      "Verify your email first."
    );

    return;
  }

  localStorage.setItem(
    "apo_ai_mode",
    modeSelect.value
  );

  if (settingsModeSelect) {
    settingsModeSelect.value =
      modeSelect.value;
  }

  $("modeHint").textContent =
    `${
      modeSelect.value[0]
        .toUpperCase() +
      modeSelect.value.slice(1)
    } mode`;
}


/* =========================
   ACCOUNT UI
========================= */

function updateAccountUI(user) {
  currentUser = user;

  setModeAccess(user);

  if (user) {
    const name =
      user.displayName ||
      user.email?.split("@")[0] ||
      "Account";

    if ($("loginBtn")) {
      $("loginBtn").textContent =
        name;
    }

    if ($("accountBtn")) {
      $("accountBtn").textContent =
        name;
    }

    $("signupBtn")
      ?.classList.add(
        "hidden"
      );

    if ($("settingsAccountName")) {
      $("settingsAccountName")
        .textContent =
        name;
    }

    if ($("settingsAccountEmail")) {
      $("settingsAccountEmail")
        .textContent =
        user.email || "";
    }

    if ($("accountAvatar")) {
      $("accountAvatar")
        .textContent =
        name
          .slice(0, 1)
          .toUpperCase();
    }

    if ($("verificationStatus")) {
      $("verificationStatus")
        .textContent =
        isGoogleUser(user)
          ? "Verified with Google"
          : user.emailVerified
            ? "Verified"
            : "Not verified";
    }

    $("verifyFromSettingsBtn")
      ?.classList.toggle(
        "hidden",
        user.emailVerified ||
        isGoogleUser(user)
      );

    $("logoutBtn")
      ?.classList.remove(
        "hidden"
      );

    $("ownerTabBtn")
      ?.classList.toggle(
        "hidden",
        !isOwner(user)
      );
  }

  else {
    if ($("loginBtn")) {
      $("loginBtn").textContent =
        "Log in";
    }

    if ($("accountBtn")) {
      $("accountBtn").textContent =
        "Log in";
    }

    $("signupBtn")
      ?.classList.remove(
        "hidden"
      );

    if ($("settingsAccountName")) {
      $("settingsAccountName")
        .textContent =
        "Not signed in";
    }

    if ($("settingsAccountEmail")) {
      $("settingsAccountEmail")
        .textContent =
        "Sign in to sync your account.";
    }

    if ($("accountAvatar")) {
      $("accountAvatar")
        .textContent =
        "A";
    }

    if ($("verificationStatus")) {
      $("verificationStatus")
        .textContent =
        "Not signed in";
    }

    $("verifyFromSettingsBtn")
      ?.classList.add(
        "hidden"
      );

    $("logoutBtn")
      ?.classList.add(
        "hidden"
      );

    $("ownerTabBtn")
      ?.classList.add(
        "hidden"
      );
  }
}


/* =========================
   AUTH UI
========================= */

function updateAuthUI() {
  const signup =
    authMode === "signup";

  $("authTitle").textContent =
    signup
      ? "Create your account"
      : "Welcome back";

  $("authSubtitle").textContent =
    signup
      ? "Choose a display name and create your APO AI account."
      : "Log in to continue to APO AI.";

  $("authSubmit").textContent =
    signup
      ? "Create account"
      : "Log in";

  $("displayNameWrap")
    ?.classList.toggle(
      "hidden",
      !signup
    );

  if ($("displayNameInput")) {
    $("displayNameInput").required =
      signup;
  }

  if ($("passwordInput")) {
    $("passwordInput").autocomplete =
      signup
        ? "new-password"
        : "current-password";
  }

  $("switchAuthMode").textContent =
    signup
      ? "Already have an account? Log in"
      : "Don't have an account? Sign up";

  $("verifyBox")
    ?.classList.add(
      "hidden"
    );
}

function openAuth(
  mode = "login"
) {
  if (currentUser) {
    $("settingsBtn")?.click();
    return;
  }

  authMode = mode;

  updateAuthUI();

  openModal(
    $("authModal")
  );
}

function authError(error) {
  const errors = {
    "auth/email-already-in-use":
      "That email already has an account.",

    "auth/invalid-email":
      "That email address is not valid.",

    "auth/weak-password":
      "Use a password with at least 6 characters.",

    "auth/invalid-credential":
      "Wrong email or password.",

    "auth/popup-closed-by-user":
      "Google sign-in was closed before finishing.",

    "auth/popup-blocked":
      "Your browser blocked the Google sign-in popup.",

    "auth/unauthorized-domain":
      "Add apo-official.github.io to Firebase Authentication → Settings → Authorized domains.",

    "auth/network-request-failed":
      "Network error. Check your internet connection.",

    "auth/operation-not-allowed":
      "This sign-in method is not enabled in Firebase.",

    "auth/web-storage-unsupported":
      "This browser blocks Firebase authentication storage. Try Chrome."
  };

  return (
    errors[error?.code] ||
    error?.message ||
    "Authentication failed."
  );
}

function setAuthBusy(busy) {
  if ($("authSubmit")) {
    $("authSubmit").disabled =
      busy;

    $("authSubmit").textContent =
      busy
        ? "Please wait..."
        : authMode === "signup"
          ? "Create account"
          : "Log in";
  }

  if ($("googleBtn")) {
    $("googleBtn").disabled =
      busy;
  }
}


/* =========================
   EMAIL VERIFY
========================= */

async function sendVerification(
  user = auth.currentUser
) {
  if (!user) {
    return;
  }

  await sendEmailVerification(
    user
  );

  $("verifyBox")
    ?.classList.remove(
      "hidden"
    );
}


/* =========================
   GOOGLE REDIRECT
========================= */

async function finishGoogleRedirect() {
  try {
    const result =
      await getRedirectResult(
        auth
      );

    if (result?.user) {
      closeModal(
        $("authModal")
      );

      updateAccountUI(
        result.user
      );
    }
  }

  catch (error) {
    console.error(
      "Google redirect error:",
      error
    );

    alert(
      authError(error)
    );
  }
}


/* =========================
   FILES / IMAGES
========================= */

function fileToDataUrl(file) {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onerror =
        reject;

      reader.onload =
        () =>
          resolve(
            reader.result
          );

      reader.readAsDataURL(
        file
      );
    }
  );
}

async function addFiles(
  files,
  source = "file"
) {
  for (
    const file
    of Array.from(files || [])
  ) {
    try {
      const isImage =
        file.type.startsWith(
          "image/"
        );

      const dataUrl =
        await fileToDataUrl(
          file
        );

      pendingAttachments.push({
        id: makeId(),

        kind:
          isImage
            ? "image"
            : "file",

        name:
          file.name,

        type:
          file.type,

        size:
          file.size,

        source,

        dataUrl
      });
    }

    catch (error) {
      console.error(
        "File error:",
        error
      );
    }
  }

  renderAttachmentPreview();
}

function renderAttachmentPreview() {
  const strip = $("attachmentPreview");

  if (!strip) return;

  strip.innerHTML = "";

  if (!pendingAttachments.length) {
    strip.classList.add("hidden");
    return;
  }

  strip.classList.remove("hidden");

  pendingAttachments.forEach((attachment) => {
    const item = document.createElement("div");
    item.className = "preview-item";

    if (attachment.kind === "image") {
      const image = document.createElement("img");

      image.src = attachment.dataUrl;
      image.alt = attachment.name || "Image";

      item.appendChild(image);
    }

    else if (attachment.kind === "voice") {
      const label = document.createElement("div");

      label.className = "preview-file";
      label.textContent = "🎙 Voice message";

      item.appendChild(label);
    }

    else {
      const label = document.createElement("div");

      label.className = "preview-file";
      label.textContent =
        "📎 " + (attachment.name || "File");

      item.appendChild(label);
    }

    const remove = document.createElement("button");

    remove.className = "preview-remove";
    remove.type = "button";
    remove.textContent = "×";

    remove.onclick = () => {
      pendingAttachments =
        pendingAttachments.filter(
          x => x.id !== attachment.id
        );

      renderAttachmentPreview();
    };

    item.appendChild(remove);
    strip.appendChild(item);
  });
}

async function startRecording() {
  if (
    !navigator.mediaDevices?.getUserMedia ||
    typeof MediaRecorder === "undefined"
  ) {
    alert(
      "Voice recording is not supported in this browser."
    );

    return;
  }

  try {
    const stream =
      await navigator.mediaDevices.getUserMedia({
        audio: true
      });

    recordedChunks = [];

    mediaRecorder =
      new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      clearInterval(recordingTimer);

      $("recordingToast")
        ?.classList.add("hidden");

      $("micBtn")
        ?.classList.remove("recording");

      const blob = new Blob(
        recordedChunks,
        {
          type:
            mediaRecorder.mimeType ||
            "audio/webm"
        }
      );

      const file = new File(
        [blob],
        "voice-" + Date.now() + ".webm",
        {
          type: blob.type
        }
      );

      const dataUrl =
        await fileToDataUrl(file);

      pendingAttachments.push({
        id: makeId(),
        kind: "voice",
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl
      });

      stream
        .getTracks()
        .forEach(
          track => track.stop()
        );

      renderAttachmentPreview();
    };

    mediaRecorder.start();

    recordingStartedAt =
      Date.now();

    $("recordingToast")
      ?.classList.remove("hidden");

    $("micBtn")
      ?.classList.add("recording");

    const updateTimer = () => {
      const seconds =
        Math.floor(
          (
            Date.now() -
            recordingStartedAt
          ) / 1000
        );

      const minutes =
        Math.floor(seconds / 60);

      const remaining =
        String(
          seconds % 60
        ).padStart(2, "0");

      if ($("recordingTime")) {
        $("recordingTime").textContent =
          "Recording " +
          minutes +
          ":" +
          remaining;
      }
    };

    updateTimer();

    recordingTimer =
      setInterval(
        updateTimer,
        500
      );
  }

  catch (error) {
    console.error(error);

    alert(
      "Microphone permission was blocked or unavailable."
    );
  }
}

function stopRecording() {
  if (
    mediaRecorder &&
    mediaRecorder.state !== "inactive"
  ) {
    mediaRecorder.stop();
  }
}

function switchSettingsTab(name) {
  document
    .querySelectorAll(".settings-tab")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.tab === name
      );
    });

  document
    .querySelectorAll(".settings-panel")
    .forEach(panel => {
      panel.classList.toggle(
        "active",
        panel.dataset.panel === name
      );
    });
}

function loadOwnerSettings() {
  const owner =
    readJSON(
      "apo_owner_settings",
      {
        systemPrompt:
          "You are APO AI. Be helpful, clear, and concise.",
        images: true,
        voice: true,
        maintenance: false
      }
    );

  if ($("ownerSystemPrompt")) {
    $("ownerSystemPrompt").value =
      owner.systemPrompt || "";
  }

  if ($("ownerImagesToggle")) {
    $("ownerImagesToggle").checked =
      owner.images !== false;
  }

  if ($("ownerVoiceToggle")) {
    $("ownerVoiceToggle").checked =
      owner.voice !== false;
  }

  if ($("ownerMaintenanceToggle")) {
    $("ownerMaintenanceToggle").checked =
      owner.maintenance === true;
  }
                             }

/* =========================
   BUTTON EVENTS
========================= */

$("menuBtn")?.addEventListener("click", () => {
  if (sidebar?.classList.contains("open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
});

sidebarOverlay?.addEventListener(
  "click",
  closeSidebar
);

$("homeBtn")?.addEventListener("click", () => {
  activeChatId = null;
  renderAll();
  closeSidebar();
});

$("newChatBtn")?.addEventListener("click", () => {
  activeChatId = null;
  renderAll();
  closeSidebar();
  messageInput?.focus();
});


/* SUGGESTIONS */

document
  .querySelectorAll(".suggestion")
  .forEach(button => {
    button.addEventListener("click", () => {
      if (!messageInput) return;

      messageInput.value =
        button.dataset.prompt || "";

      autoResize();
      messageInput.focus();
    });
  });


/* MESSAGE INPUT + SEND */

messageInput?.addEventListener(
  "input",
  autoResize
);

messageInput?.addEventListener(
  "keydown",
  event => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  }
);

$("sendBtn")?.addEventListener(
  "click",
  sendMessage
);


/* MODES */

modeSelect?.addEventListener(
  "change",
  updateMode
);

settingsModeSelect?.addEventListener(
  "change",
  () => {
    if (!modeSelect) return;

    modeSelect.value =
      settingsModeSelect.value;

    updateMode();
  }
);

$("modeLock")?.addEventListener(
  "click",
  () => openAuth("login")
);


/* + MENU */

$("plusBtn")?.addEventListener(
  "click",
  event => {
    event.stopPropagation();

    $("plusMenu")
      ?.classList.toggle("hidden");
  }
);

document.addEventListener(
  "click",
  event => {
    if (
      !event.target.closest(".plus-wrap")
    ) {
      $("plusMenu")
        ?.classList.add("hidden");
    }
  }
);


/* CAMERA / PHOTOS / FILES */

$("cameraBtn")?.addEventListener(
  "click",
  () => {
    $("plusMenu")
      ?.classList.add("hidden");

    $("cameraInput")?.click();
  }
);

$("photosBtn")?.addEventListener(
  "click",
  () => {
    $("plusMenu")
      ?.classList.add("hidden");

    $("photosInput")?.click();
  }
);

$("filesBtn")?.addEventListener(
  "click",
  () => {
    $("plusMenu")
      ?.classList.add("hidden");

    $("filesInput")?.click();
  }
);

$("cameraInput")?.addEventListener(
  "change",
  event => {
    addFiles(
      event.target.files,
      "camera"
    );

    event.target.value = "";
  }
);

$("photosInput")?.addEventListener(
  "change",
  event => {
    addFiles(
      event.target.files,
      "photos"
    );

    event.target.value = "";
  }
);

$("filesInput")?.addEventListener(
  "change",
  event => {
    addFiles(
      event.target.files,
      "files"
    );

    event.target.value = "";
  }
);


/* VOICE */

$("micBtn")?.addEventListener(
  "click",
  () => {
    if (
      mediaRecorder &&
      mediaRecorder.state === "recording"
    ) {
      stopRecording();
    } else {
      startRecording();
    }
  }
);

$("stopRecordingBtn")
  ?.addEventListener(
    "click",
    stopRecording
  );


/* LOGIN / SIGNUP */

$("signupBtn")
  ?.addEventListener(
    "click",
    () => openAuth("signup")
  );

$("loginBtn")
  ?.addEventListener(
    "click",
    () => openAuth("login")
  );

$("accountBtn")
  ?.addEventListener(
    "click",
    () => {
      closeSidebar();

      if (currentUser) {
        $("settingsBtn")?.click();
        switchSettingsTab("account");
      } else {
        openAuth("login");
      }
    }
  );


/* AUTH MODAL */

$("authClose")
  ?.addEventListener(
    "click",
    () =>
      closeModal(
        $("authModal")
      )
  );

$("switchAuthMode")
  ?.addEventListener(
    "click",
    () => {
      authMode =
        authMode === "login"
          ? "signup"
          : "login";

      updateAuthUI();
    }
  );

$("authModal")
  ?.addEventListener(
    "click",
    event => {
      if (
        event.target ===
        $("authModal")
      ) {
        closeModal(
          $("authModal")
        );
      }
    }
  );


/* EMAIL / PASSWORD AUTH */

$("authForm")
  ?.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      setAuthBusy(true);

      try {
        const email =
          $("emailInput")
            ?.value.trim() || "";

        const password =
          $("passwordInput")
            ?.value || "";

        if (authMode === "signup") {
          const displayName =
            $("displayNameInput")
              ?.value.trim() || "";

          if (!displayName) {
            alert(
              "Choose a display name."
            );

            return;
          }

          const result =
            await createUserWithEmailAndPassword(
              auth,
              email,
              password
            );

          await updateProfile(
            result.user,
            {
              displayName
            }
          );

          await sendVerification(
            result.user
          );

          $("verifyBox")
            ?.classList.remove(
              "hidden"
            );
        } else {
          const result =
            await signInWithEmailAndPassword(
              auth,
              email,
              password
            );

          if (
            !result.user.emailVerified &&
            !isGoogleUser(result.user)
          ) {
            $("verifyBox")
              ?.classList.remove(
                "hidden"
              );
          } else {
            closeModal(
              $("authModal")
            );
          }
        }
      } catch (error) {
        console.error(error);

        alert(
          authError(error)
        );
      } finally {
        setAuthBusy(false);
      }
    }
  );


/* GOOGLE AUTH */

$("googleBtn")
  ?.addEventListener(
    "click",
    async () => {
      setAuthBusy(true);

      try {
        const mobile =
          /Android|iPhone|iPad|iPod/i
            .test(
              navigator.userAgent
            );

        if (mobile) {
          await signInWithRedirect(
            auth,
            googleProvider
          );

          return;
        }

        const result =
          await signInWithPopup(
            auth,
            googleProvider
          );

        closeModal(
          $("authModal")
        );

        updateAccountUI(
          result.user
        );
      } catch (error) {
        console.error(
          "Google login:",
          error
        );

        if (
          error?.code ===
            "auth/popup-blocked" ||
          error?.code ===
            "auth/web-storage-unsupported"
        ) {
          try {
            await signInWithRedirect(
              auth,
              googleProvider
            );

            return;
          } catch (
            redirectError
          ) {
            alert(
              authError(
                redirectError
              )
            );
          }
        } else {
          alert(
            authError(error)
          );
        }
      } finally {
        setAuthBusy(false);
      }
    }
  );


/* EMAIL VERIFICATION */

$("resendVerifyBtn")
  ?.addEventListener(
    "click",
    async () => {
      try {
        await sendVerification(
          auth.currentUser
        );

        alert(
          "Verification email sent again."
        );
      } catch (error) {
        alert(
          authError(error)
        );
      }
    }
  );

$("checkVerifyBtn")
  ?.addEventListener(
    "click",
    async () => {
      if (!auth.currentUser) {
        return;
      }

      try {
        await reload(
          auth.currentUser
        );

        if (
          auth.currentUser
            .emailVerified
        ) {
          closeModal(
            $("authModal")
          );

          updateAccountUI(
            auth.currentUser
          );

          alert(
            "Email verified!"
          );
        } else {
          alert(
            "Your email is still not verified yet."
          );
        }
      } catch (error) {
        alert(
          authError(error)
        );
      }
    }
  );


/* SETTINGS */

$("settingsBtn")
  ?.addEventListener(
    "click",
    () => {
      closeSidebar();

      loadOwnerSettings();

      openModal(
        $("settingsModal")
      );
    }
  );

$("settingsClose")
  ?.addEventListener(
    "click",
    () =>
      closeModal(
        $("settingsModal")
      )
  );

$("settingsModal")
  ?.addEventListener(
    "click",
    event => {
      if (
        event.target ===
        $("settingsModal")
      ) {
        closeModal(
          $("settingsModal")
        );
      }
    }
  );

document
  .querySelectorAll(
    ".settings-tab"
  )
  .forEach(
    button => {
      button.addEventListener(
        "click",
        () => {
          switchSettingsTab(
            button.dataset.tab
          );
        }
      );
    }
  );


/* THEME */

$("themeToggle")
  ?.addEventListener(
    "click",
    () => {
      document.body
        .classList.toggle(
          "light"
        );

      const light =
        document.body
          .classList.contains(
            "light"
          );

      $("themeToggle")
        .textContent =
        light
          ? "Dark mode"
          : "Light mode";

      localStorage.setItem(
        "apo_ai_theme",
        light
          ? "light"
          : "dark"
      );
    }
  );


/* CLEAR CHATS */

$("clearChatsBtn")
  ?.addEventListener(
    "click",
    () => {
      if (
        !confirm(
          "Clear all chats saved on this device?"
        )
      ) {
        return;
      }

      chats = [];
      activeChatId = null;

      saveChats();
      renderAll();
    }
  );


/* VERIFY FROM SETTINGS */

$("verifyFromSettingsBtn")
  ?.addEventListener(
    "click",
    async () => {
      if (!auth.currentUser) {
        return;
      }

      try {
        await sendVerification(
          auth.currentUser
        );

        closeModal(
          $("settingsModal")
        );

        openModal(
          $("authModal")
        );

        $("verifyBox")
          ?.classList.remove(
            "hidden"
          );
      } catch (error) {
        alert(
          authError(error)
        );
      }
    }
  );


/* LOGOUT */

$("logoutBtn")
  ?.addEventListener(
    "click",
    async () => {
      await signOut(auth);

      closeModal(
        $("settingsModal")
      );
    }
  );


/* OWNER CONTROLS */

$("saveOwnerBtn")
  ?.addEventListener(
    "click",
    () => {
      if (!isOwner()) {
        alert(
          "Owner access required."
        );

        return;
      }

      const settings = {
        systemPrompt:
          $("ownerSystemPrompt")
            ?.value.trim() || "",

        images:
          $("ownerImagesToggle")
            ?.checked !== false,

        voice:
          $("ownerVoiceToggle")
            ?.checked !== false,

        maintenance:
          $("ownerMaintenanceToggle")
            ?.checked === true
      };

      localStorage.setItem(
        "apo_owner_settings",
        JSON.stringify(
          settings
        )
      );

      alert(
        "Owner settings saved."
      );
    }
  );


/* ESCAPE KEY */

document.addEventListener(
  "keydown",
  event => {
    if (event.key === "Escape") {
      closeSidebar();

      closeModal(
        $("authModal")
      );

      closeModal(
        $("settingsModal")
      );

      $("plusMenu")
        ?.classList.add(
          "hidden"
        );
    }
  }
);


/* FIREBASE AUTH STATE */

onAuthStateChanged(
  auth,
  user => {
    updateAccountUI(user);
  }
);


/* STARTUP */

if (
  localStorage.getItem(
    "apo_ai_theme"
  ) === "light"
) {
  document.body
    .classList.add(
      "light"
    );

  if ($("themeToggle")) {
    $("themeToggle")
      .textContent =
      "Dark mode";
  }
}

finishGoogleRedirect();

loadOwnerSettings();

setModeAccess(null);

renderAll();

autoResize();
