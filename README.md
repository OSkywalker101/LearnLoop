# LearnLoop

A personalized AI-powered learning platform that adapts to your pace, knowledge level, and goals. Built as a polished portfolio project demonstrating full-stack development, AI integration, and cloud deployment.

## Live Demo

**[https://learnloop-academy.netlify.app](https://learnloop-academy.netlify.app)**

Sign in with `oskywalker@gmail.com` / `OS10`, or use **Continue with demo** to skip the form.

## Features

- **Personalized Curriculum Generation** - AI creates structured learning paths based on your subject, time availability, current knowledge, and desired depth
- **Adaptive Learning Engine** - Rule-based system that recommends revisions, prerequisite reviews, or advanced content based on quiz performance
- **Interactive Lessons** - Rich content blocks: objectives, notes, explanations, analogies, worked examples, diagrams (Mermaid), key terms, takeaways
- **Smart Quizzes** - Multiple choice, multiple select, and short answer questions with immediate feedback and explanations
- **Progress Tracking** - Visual dashboards with streaks, concept mastery, study time, and quiz scores
- **Audio Playback** - Browser speech synthesis for listening to lesson content
- **Offline-First Demo Mode** - Works immediately without any API keys or backend setup
- **Responsive Design** - Clean, modern UI that works on mobile and desktop

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, custom design system
- **Routing**: React Router v6
- **Diagrams**: Mermaid.js
- **Validation**: Zod
- **Testing**: Vitest, React Testing Library
- **Linting**: ESLint, TypeScript ESLint
- **Deployment**: Firebase Hosting (configured, optional)

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Clone and install
cd learnloop
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 to use the app immediately in demo mode.

### Demo Mode

The app runs fully in demo mode by default:
- No API keys required
- Curriculum, lessons, and quizzes are generated from built-in templates
- Progress persists in localStorage
- All features functional for evaluation

## Configuration

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_FIREBASE_API_KEY` | No | Firebase project API key |
| `VITE_FIREBASE_PROJECT_ID` | No | Firebase project ID |
| `VITE_FIREBASE_AUTH_DOMAIN` | No | Firebase auth domain |
| `CF_ACCOUNT_ID` | No | Cloudflare account ID for Workers AI |
| `CF_API_TOKEN` | No | Cloudflare API token |
| `VITE_ENABLE_AI_GENERATION` | No | Enable live AI (default: false) |
| `VITE_ENABLE_FIREBASE_SYNC` | No | Enable cloud sync (default: false) |

### AI Provider Setup

The app uses a provider abstraction. To enable live AI generation:

#### Option 1: Firebase AI Logic (Gemini)
1. Create a Firebase project on the **Blaze plan** (required for Vertex AI)
2. Enable **Vertex AI API** in Google Cloud Console
3. Add Firebase config to `.env.local`
4. Set `VITE_ENABLE_AI_GENERATION=true`
5. Set `VITE_ENABLE_FIREBASE_SYNC=true`

#### Option 2: Cloudflare Workers AI
1. Create a Cloudflare account
2. Go to Workers & Pages → AI
3. Get Account ID and create an API token with Workers AI permissions
4. Add to `.env.local`
5. Set `VITE_ENABLE_AI_GENERATION=true`

**Note**: The demo mode works perfectly without any AI provider. Live AI is optional for portfolio demonstration.

### Authentication

LearnLoop is a client-side app — there is no backend and no real authentication server.
The `/login` page gates the app and offers three entry points:

1. **Sign in** — accepts the demo credentials `oskywalker@gmail.com` / `OS10`.
2. **Register** — collects name, organization, email, password, confirm password, and a
   "verify email" field (must match the email). Validation is client-side only.
3. **Continue with demo** — bypasses the form entirely and enters the wizard as a guest.

The session is stored in `localStorage` under `learnloop_auth` (see `src/lib/auth.ts`).
All routes except `/` and `/login` are guarded by `RequireAuth` in `src/App.tsx`; an
unauthenticated visit is redirected to `/login` and returned to the original page after
sign-in. **This is a demo login, not a security boundary** — credentials live in the
client bundle and can be read by anyone.

### Securing the API key

There is no server, so a key used by the browser cannot be truly hidden. LearnLoop uses a
best-effort approach:

- The Groq key is **not** stored in `VITE_GROQ_API_KEY` (that would inline it as a plaintext
  `gsk_...` string in the shipped JS).
- It is stored **obfuscated** (XOR + base64) in `src/lib/secret.ts` and decoded at runtime.
  This defeats casual copy-paste and secret scanners, but is not cryptographic protection.
- Users can override it with their own key; it is kept in their own browser under
  `learnloop_user_api_key` and takes precedence over the shared key.
- If no key is available, the app falls back to demo mode.

> If you ever need real secrecy, move the key behind a serverless proxy (e.g. Netlify
> Functions) and never ship it to the client.

### Why diagrams and audio are free

- **Diagrams** are plain text + a client-side library. The LLM returns `mermaidCode` (a
  string); Mermaid (v12) renders it to SVG **in the browser**. No image API, no per-render
  cost. See `MermaidDiagram` in `src/components/lesson/LessonPage.tsx`.
- **Audio** uses the browser's built-in **Web Speech API**
  (`window.speechSynthesis` + `SpeechSynthesisUtterance`) in the `AudioPlayer` component.
  The OS/browser voice reads the lesson text aloud. No TTS service, no key, no audio files.

Both are therefore zero-cost and depend only on the user's device.

## Project Structure

```
src/
├── components/
│   ├── ui/              # Reusable UI components (Button, Card, Input, etc.)
│   ├── landing/         # Landing page
│   ├── wizard/          # Course setup wizard
│   ├── dashboard/       # Curriculum dashboard
│   ├── lesson/          # Interactive lesson view
│   ├── quiz/            # Quiz and results pages
│   └── progress/        # Progress dashboard
├── context/
│   └── AppContext.tsx   # Global state management
├── lib/
│   ├── ai-provider.ts   # AI provider abstraction + demo implementation
│   ├── adaptive-engine.ts # Adaptive learning logic
│   └── storage.ts       # localStorage demo storage
├── types/
│   └── index.ts         # TypeScript type definitions
├── utils/
│   └── helpers.ts       # Utility functions
├── App.tsx              # Routes
└── main.tsx             # Entry point
```

## Data Model

Key entities (defined in `src/types/index.ts`):

- **Course** - Generated curriculum with modules, lessons, schedule
- **Lesson** - Individual learning unit with content blocks
- **Quiz/QuizQuestion** - Assessments with multiple question types
- **ConceptMastery** - Per-concept tracking (accuracy, status, review schedule)
- **QuizAttempt** - User's quiz submissions with scoring
- **StudySession** - Time-tracked learning sessions
- **AdaptiveRecommendation** - Engine suggestions with reasoning

## Adaptive Engine

The adaptive engine (`src/lib/adaptive-engine.ts`) implements transparent, deterministic rules:

1. **Low Accuracy** (< 60%) → Triggers targeted revision
2. **Repeated Failures** (≥ 2 consecutive) → Suggests prerequisite review
3. **High Accuracy** (> 85%) → Allows progression to harder content
4. **Spaced Repetition** → Concepts due for review based on intervals
5. **Missed Sessions** → Reschedules future lessons

All recommendations include a reason and confidence score shown to the learner.

## Testing

```bash
# Run tests
npm run test

# Run tests with UI
npm run test -- --ui

# Run linting
npm run lint

# Type checking
npx tsc --noEmit
```

Test coverage includes:
- Curriculum schedule calculations
- Time budget validation
- Quiz scoring logic
- Concept mastery updates
- Adaptive recommendations
- Revision scheduling

## Building for Production

```bash
# Production build
npm run build

# Preview production build
npm run preview
```

Output is in `dist/` directory.

## Deployment

The live deployment is hosted on **Netlify**: [https://learnloop-academy.netlify.app](https://learnloop-academy.netlify.app)

| Setting | Value |
|---|---|
| Site | `learnloop-academy` |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Framework preset | Vite |
| SPA rewrite | `/*` → `/index.html` (200) |

Deploy a new version with:

```bash
npm run build
npx netlify deploy --prod --dir=dist
```

### Firebase Hosting (Recommended)

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login and initialize**
   ```bash
   firebase login
   firebase init hosting
   ```
   - Select your Firebase project
   - Public directory: `dist`
   - Single-page app: `Yes`
   - Overwrite index.html: `No`

3. **Configure `firebase.json`**
   ```json
   {
     "hosting": {
       "public": "dist",
       "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
       "rewrites": [
         { "source": "**", "destination": "/index.html" }
       ],
       "headers": [
         {
           "source": "**/*.@(js|css)",
           "headers": [{ "key": "Cache-Control", "value": "max-age=31536000" }]
         }
       ]
     }
   }
   ```

4. **Deploy**
   ```bash
   npm run build
   firebase deploy
   ```

### Alternative: Netlify / Vercel / Cloudflare Pages

1. Connect your Git repository
2. Build command: `npm run build`
3. Output directory: `dist`
4. Add environment variables in dashboard

### Firebase Security Rules (if using Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /courses/{courseId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    match /lessons/{lessonId} {
      allow read, write: if request.auth != null;
    }
    match /quizAttempts/{attemptId} {
      allow read, write: if request.auth != null;
    }
    match /conceptMasteries/{masteryId} {
      allow read, write: if request.auth != null;
    }
    match /studySessions/{sessionId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Free Tier Considerations

| Service | Free Tier Limits |
|---------|------------------|
| Firebase Hosting | 10 GB storage, 360 MB/day transfer |
| Firebase Auth | 50k MAU (Spark plan) |
| Firestore | 1 GB storage, 50k reads/day, 20k writes/day |
| Cloudflare Workers AI | 100k neurons/day (generous for demos) |
| GitHub Pages / Netlify / Vercel | Unlimited for personal projects |

**Demo mode requires zero external services and runs entirely client-side.**

## Architecture Decisions

### Why This Stack?
- **React + Vite**: Fast dev experience, small bundle, wide ecosystem
- **Tailwind CSS**: Utility-first, no context switching, easy customization
- **localStorage for Demo**: Zero backend, works offline, instant persistence
- **Provider Abstraction**: Swap AI providers without rewriting app logic
- **Rule-Based Adaptive**: Explainable, debuggable, no ML infrastructure needed

### Trade-offs

| Decision | Trade-off |
|----------|-----------|
| Demo mode only | No real AI generation, but works everywhere |
| localStorage | No cross-device sync, but zero setup |
| Rule-based adaptive | Not ML-powered, but transparent and controllable |
| Client-side only | No server costs, but no server-side secrets |
| Firebase optional | Can deploy free, but requires Blaze for AI |

### Limitations & Future Improvements

- **Current**: Demo content templates are generic
- **Future**: Domain-specific curriculum templates (programming, languages, sciences)
- **Current**: Short-answer grading is heuristic
- **Future**: LLM-based semantic grading for open-ended questions
- **Current**: No user accounts in demo
- **Future**: Anonymous-to-registered upgrade flow with data migration
- **Current**: Single-user localStorage
- **Future**: Multi-device sync with Firestore
- **Current**: Basic spaced repetition
- **Future**: SM-2 algorithm implementation

## Resume Summary

> **LearnLoop** — Full-stack AI learning platform (React, TypeScript, Tailwind, Firebase)
> - Built adaptive learning engine with spaced repetition and performance-based recommendations
> - Designed provider-agnostic AI abstraction supporting Firebase Vertex AI and Cloudflare Workers AI
> - Implemented interactive lessons with Mermaid diagrams, speech synthesis, and multi-format quizzes
> - Deployed on Firebase Hosting with Firestore security rules and zero-cost demo mode
> - Comprehensive test coverage for scheduling, scoring, and adaptation logic

## License

MIT — Feel free to use for learning, portfolio, or as a starting point for your own projects.

## Acknowledgments

- Design inspired by Duolingo's progression system and modern SaaS aesthetics
- Mermaid.js for diagram rendering
- Lucide for icons
- Inter & Plus Jakarta Sans fonts via Google Fonts