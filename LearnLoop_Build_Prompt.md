# Build LearnLoop: A Personalised AI Learning Platform

You are a senior full stack engineer, AI engineer, and product designer. Build a complete, polished, production minded MVP called **LearnLoop**.

Do not just create a landing page, a UI mockup, or a plan. Inspect the repository, make sensible decisions, implement the application, run it, test it, and document how to deploy it publicly.

## 1. Product vision

LearnLoop helps anyone learn any subject according to their available time, current knowledge, and desired depth.

The user provides:
- What they want to learn.
- Their existing knowledge level.
- How much time they can dedicate per day.
- Their deadline or target completion period.
- How deeply they want to learn.
- Their preferred learning formats.

The application generates a structured curriculum, breaks it into realistic lessons, creates learning materials, assesses understanding, and adapts future lessons according to quiz performance.

The experience should combine the structured progression of Duolingo with the flexibility of a personalised AI tutor.

**The core differentiator is adaptive, time aware learning, not simply AI generated notes.**

## 2. Non negotiable constraints

1. The application must work as a publicly accessible cloud deployed website.
2. A recruiter must be able to open the URL and use the product without installing anything.
3. Do not require local models, a local backend, a locally running Ollama instance, or the developer's computer to remain online.
4. Prioritise services that can operate on free plans without requiring a credit card or billing account.
5. Do not introduce paid dependencies unnecessarily.
6. Do not replace meaningful features with static mockups or hardcoded demo responses.
7. Do not build an elaborate enterprise architecture. This is a polished individual portfolio project.
8. Do not expose API keys, service credentials, or privileged database access in frontend code.
9. Never silently claim that an external AI provider is free, available, or configured. Verify the actual requirements and quota limitations.
10. If credentials are unavailable, implement the integration, provide a clear setup guide, and build a working fallback that does not falsely pretend to perform live AI inference.

Before selecting the stack, verify current provider documentation and free tier limitations wherever internet access is available. Do not assume old pricing or quotas remain valid.

## 3. Preferred technology stack

Use the following stack unless repository constraints or verified provider requirements justify a better option.

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- A polished component system such as shadcn/ui, if compatible
- Lucide icons
- React Router
- Mermaid.js for diagrams

### Cloud infrastructure
Prefer Firebase's no cost Spark plan where supported:
- Firebase Hosting for the public website.
- Firebase Authentication for optional user accounts.
- Cloud Firestore for curricula, lessons, assessments, and progress.
- Firebase AI Logic with a supported Gemini model, if the chosen configuration works within the intended free setup.

Investigate whether Firebase AI Logic can be used safely and without requiring a billing account for the exact model and configuration selected.

If AI access requires billing or is otherwise unsuitable, investigate Cloudflare Workers AI and its current free allocation as an alternative server side inference provider.

Do not migrate the entire project to another provider merely because one AI integration needs changing.

Keep the AI provider behind a small, documented abstraction so it can be replaced without rewriting the learning application.

Do not add AWS services simply for their names. The deployed product and genuinely free operating costs take priority. The README can explain how the architecture could later integrate AWS Lambda, API Gateway, DynamoDB, and Amazon Bedrock.

### AI generation
- Generate structured JSON for curricula, lesson content, and quizzes.
- Validate model output against TypeScript schemas using Zod.
- Retry malformed output a limited number of times.
- Provide graceful error messages for rate limits, timeouts, and unavailable models.
- Cache generated material and avoid repeated inference for identical requests.
- Never put a privileged provider API key in browser JavaScript.
- If a public client integration is used, apply the provider's recommended security controls and restrict access appropriately.

### Audio
Use browser speech synthesis as the default zero cost audio feature. Make it possible to listen to lesson content and pause or resume playback.

Do not require a paid text to speech API.

### Deployment
Configure the chosen hosting provider to deploy the frontend and any required server side components. Include build commands, routing rewrites, environment variable documentation, and deployment instructions.

## 4. Main user experience

Build the following screens.

### A. Landing page

Create an excellent first impression with:
- LearnLoop branding.
- A concise value proposition.
- A clear call to action: Start learning.
- An attractive preview of a personalised curriculum.
- A brief explanation of adaptive learning.
- A sample lesson and progress visualisation.
- A responsive design for mobile and desktop.

Avoid generic AI startup landing page clichés, excessive gradients, meaningless metrics, and huge amounts of marketing text.

### B. Learning setup wizard

Ask the user for:

1. Subject or learning goal.
2. Current knowledge: beginner, intermediate, or advanced.
3. Available time per day.
4. Target duration or completion date.
5. Desired depth:
   - Quick: core concepts and short assessments.
   - Thorough: detailed explanations and practical examples.
   - Mastery: deeper theory, exercises, implementation, and a final challenge.
6. Optional learning preferences such as text, diagrams, audio, and practice.

Show a concise summary before generating the curriculum.

Validate the time budget and schedule. Do not promise that a subject can be mastered in an unrealistic time frame. Clearly distinguish estimated coverage from demonstrated mastery.

### C. Curriculum dashboard

Generate a coherent curriculum with:
- Course title and description.
- Learning objectives.
- Prerequisite concepts.
- Ordered modules and lessons.
- Estimated duration for each lesson.
- Daily schedule based on the available time.
- Progress indicators.
- Completed, current, and upcoming lessons.
- A continue learning button.

The schedule must be internally consistent with the available study time.

If a curriculum is too large for one generation, use a staged generation approach. Generate the course outline first and detailed lessons on demand.

Allow the user to regenerate or adjust the schedule without unnecessarily losing completed progress.

### D. Interactive lesson page

Each lesson should support the following content blocks:

- Learning objectives.
- Concise notes.
- Detailed explanations.
- Intuitive analogies.
- Worked examples.
- Important terms and definitions.
- Mermaid diagrams where appropriate.
- Key takeaways.
- A short knowledge check.
- A quiz.
- An audio playback control.
- Previous and next lesson navigation.

Allow the learner to select an explanation and request a simpler explanation or an additional example, subject to provider availability.

Ensure that the diagram renderer handles invalid Mermaid syntax safely and provides a readable error state.

Do not generate a diagram merely to fill space. Use diagrams when they help explain the concept.

### E. Quiz and assessment

Support:
- Multiple choice questions.
- Multiple select questions where practical.
- Short answer questions when appropriate.
- Immediate feedback.
- Correct answers and explanations.
- Score summaries.
- Identification of weak concepts.
- A retry option.

Grade objective questions deterministically on the application side.

Do not rely on an LLM to decide whether a multiple choice answer is correct when the answer key is already available.

Store quiz attempts and maintain a history of results.

### F. Adaptive learning engine

This is the most important feature.

Maintain a simple learner knowledge model that records:
- Concepts studied.
- Quiz accuracy per concept.
- Recent performance.
- Concepts requiring revision.
- Lesson completion.
- Upcoming revision recommendations.

Implement transparent, deterministic adaptation rules.

For example:
- Low quiz accuracy triggers targeted revision.
- Repeated errors trigger a prerequisite review or simpler explanation.
- Strong performance allows progression to a harder exercise.
- Previously studied concepts return for revision.
- Missed study sessions cause future lessons to be rescheduled.

The system must not treat a completed lesson as proof of mastery.

Show the learner why the next lesson or revision was recommended.

Do not implement a complicated machine learning recommendation model. A small, explainable rule based system is sufficient and more appropriate for this MVP.

### G. Progress and revision dashboard

Show:
- Course completion.
- Lessons completed.
- Study time.
- Quiz accuracy.
- Strong concepts.
- Concepts needing revision.
- Upcoming lessons.
- Recommended next action.

Use real data from the application rather than invented analytics.

Provide a clear empty state for a new learner.

## 5. Data model

Design a simple, documented data model for:

- User profile.
- Course.
- Curriculum module.
- Lesson.
- Quiz question.
- Quiz attempt.
- Concept mastery.
- Study session.
- Revision schedule.

Use stable IDs and explicit relationships.

With Firestore:
- Design efficient queries.
- Avoid unnecessary document reads and writes.
- Use batched operations where appropriate.
- Add Firestore security rules that restrict users to their own private data.
- Validate all privileged writes.
- Never deploy permissive production rules.

Provide an anonymous demo mode so recruiters can try the application immediately without creating an account.

The demo should use a clearly labelled sample course and persisted demo progress where feasible. It must not expose another user's private data.

## 6. AI provider implementation

Implement a provider abstraction with operations such as:

- generateCurriculum()
- generateLesson()
- generateQuiz()
- simplifyExplanation()
- generateWorkedExample()

Require structured, validated outputs.

Use topic, skill level, time budget, desired depth, and prerequisite information as generation context.

Keep prompts in dedicated files or modules rather than scattering large prompt strings throughout the codebase.

Prevent unbounded generation loops and repeated calls.

If a provider returns an error, preserve existing progress and show a useful message.

Create a documented demo or fallback mode that uses a genuinely implemented sample course and deterministic quiz grading. Clearly indicate when content comes from sample data rather than live AI generation.

If Firebase AI Logic is used from the client, follow its supported security and abuse prevention guidance. If a server side provider is used, store credentials only in server side secrets or environment configuration.

Never commit secrets.

## 7. Design quality

The product should look like a polished educational SaaS application, not a college assignment.

Design direction:
- Clean, modern, calm interface.
- Excellent typography and spacing.
- Restrained use of colour.
- Strong visual hierarchy.
- Subtle borders and shadows.
- Beautiful course cards.
- Clear learning progress.
- Consistent iconography.
- Responsive layouts.
- Accessible contrast and keyboard navigation.
- Helpful loading, empty, success, and error states.

Use a coherent design system with reusable components.

Avoid:
- Excessive gradients.
- Random emoji used as icons.
- Giant hero sections that waste space.
- Fake statistics.
- Unnecessary animations.
- Dead buttons.
- Placeholder pages.
- Hardcoded progress disguised as user data.

The lesson page and curriculum dashboard deserve more attention than decorative marketing sections.

## 8. Security, reliability, and cost

Implement:
- Environment variable validation.
- Firestore security rules.
- Input validation and length limits.
- Safe rendering of generated Markdown and diagrams.
- AI request rate limiting where the chosen architecture supports it.
- Error handling and useful logs.
- Bounded generation retries.
- Caching.
- Graceful handling of AI quota exhaustion.
- No secrets in the repository.
- No paid service required merely to display the sample course.

Document the limitations of free quotas. Never claim unlimited usage or guaranteed zero cost.

Do not create unnecessary background workers, queues, vector databases, or microservices.

## 9. Testing

Write and run tests for:
- Curriculum schedule calculations.
- Time budget validation.
- Structured AI response validation.
- Quiz scoring.
- Concept mastery updates.
- Adaptive lesson recommendations.
- Revision scheduling.
- Firestore security rules where feasible.
- Frontend navigation and essential interactions.

Run linting, type checking, tests, and a production build.

Fix errors instead of merely documenting them.

Manually verify the essential learner journey:
1. Open the public application.
2. Start a course.
3. Generate or load the curriculum.
4. Open a lesson.
5. Review notes and a diagram.
6. Play audio.
7. Complete a quiz.
8. Observe the progress update.
9. See an adaptive recommendation.
10. Refresh the page and verify that progress persists.

## 10. Recruiter ready deliverables

Create:
- A complete working application.
- A clear README.
- An architecture diagram.
- A documented data model.
- Setup instructions.
- Free tier and cost assumptions.
- Environment variable examples without real secrets.
- Cloud deployment instructions.
- A testing guide.
- A section describing technical tradeoffs.
- A short project summary suitable for a resume.
- A list of limitations and future improvements.

If deployment credentials and permissions are available, deploy the application and verify the public URL.

If credentials are not available, finish all possible implementation work and provide exact deployment steps. Do not fabricate a deployed URL or claim a deployment succeeded when it did not.

## 11. Working method

Start by inspecting the existing repository and identifying the framework, package manager, and current implementation.

Then:
1. Briefly state the chosen architecture and why it fits the free cloud requirement.
2. Identify any genuinely blocking credentials or provider limitations.
3. Implement the complete MVP in coherent stages.
4. Run tests and fix failures.
5. Verify the production build.
6. Prepare deployment configuration and documentation.
7. Deploy and verify the live application when access permits.

Make sensible decisions without asking me to approve every small detail. Ask questions only when a missing credential, account restriction, or consequential product decision truly blocks progress.

Do not stop after writing a plan. Do not leave major features as TODO comments. Do not claim tests, cloud integrations, or deployment work succeeded unless you actually verified them.

**Definition of done:** LearnLoop is a polished, responsive, publicly deployable learning application with a real curriculum workflow, interactive lessons, quizzes, persistent progress, adaptive recommendations, diagrams, and audio. It should demonstrate sound AI integration and cloud engineering while remaining as close to zero cost as the provider quotas realistically allow.

Begin by inspecting the repository and then build it.