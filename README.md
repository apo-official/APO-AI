# APO AI

ChatGPT-style APO AI frontend with Firebase Authentication connected.

## Working now

- Email/password sign up
- Email/password login
- Google sign-in
- Firebase session persistence
- Fast / Medium / High UI
- Local chat history
- Mobile layout
- Dark/light theme

## Firebase project

This build is connected to the Firebase project `apo-ai-44c75`.

The Firebase web config in `script.js` is client-side configuration. Do not put private AI-provider API keys, Discord bot tokens, service-account keys, or other secrets in frontend files.

## Firebase Console setup required

In Firebase Authentication, enable:

1. Email/Password
2. Google

Also make sure your deployed website domain is listed under Authentication → Settings → Authorized domains.

## Still demo-only

The chat response itself is still a local demo response. The next step is to add a secure backend API for the actual AI.

Do not put the AI API key directly into `script.js`.
