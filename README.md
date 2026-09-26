# APO AI

A ChatGPT-style AI chat interface for the APO project.

## Current starter features

- ChatGPT-style responsive interface
- Fast / Medium / High mode selector
- New chat + local chat history
- Email/password login UI
- Google sign-in UI
- Dark/light mode
- Mobile sidebar
- Responsive phone layout
- Starter settings panel

## Important

This starter is frontend-only.

The AI API key must **never** be placed inside `script.js` or any public GitHub Pages file.

## Next steps

1. Connect Firebase Authentication
   - Email/password
   - Google sign-in
2. Connect Firestore
   - User profiles
   - Chat history
3. Add a secure backend API
4. Connect Fast / Medium / High modes to different reasoning settings
5. Add streaming responses
6. Add file/image uploads

## Files

- `index.html`
- `style.css`
- `script.js`

## Local testing

Open `index.html` in a browser, or host the repository with GitHub Pages.

## Security

Keep all AI provider secrets in a server-side environment variable. Never commit private API keys or Discord tokens to GitHub.
