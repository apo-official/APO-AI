# APO AI — Second Plan Upgrade

This build adds the second-plan features:

- ChatGPT-style dark UI
- `+` attachment menu
  - Camera
  - Photos
  - Files
- Image previews in chat
- File attachments
- Voice recording with the browser microphone
- Voice-message playback
- Email/password signup with display name
- Firebase email verification
- Google sign-in
- Better Settings panel
- Owner Controls visible to:
  - dachivasadze18@gmail.com
- Fast / Medium / High modes locked until sign-in
- Mobile sidebar and responsive layout

## Important: email verification
Firebase's built-in email verification sends a verification **link**, not a 6-digit code.
A true 6-digit email code requires a secure backend/email sender.

## Important: Google sign-in
For GitHub Pages, add this domain in:

Firebase Authentication → Settings → Authorized domains

apo-official.github.io

Also ensure Google is enabled in:

Firebase Authentication → Sign-in method → Google

## Important: Owner Controls
The owner UI is included, but the settings are currently stored locally in the browser.
Real secure owner/admin enforcement must be done in the backend so normal users cannot bypass it.

## Important: AI backend
The current reply is still a demo response.
Do not put a private AI API key in script.js or GitHub.

## Files
- index.html
- style.css
- script.js
- apo-logo.jpg
- README.md
