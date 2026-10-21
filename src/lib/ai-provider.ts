import type { 
  AIProvider, 
  AIProviderConfig, 
  CourseInput, 
  Course, 
  Lesson, 
  LessonContent, 
  Quiz, 
  WorkedExample,
  Concept,
  Module,
  LessonGenerationContext,
  QuizGenerationContext,
  QuizQuestion,
  DailyScheduleItem,
  DepthLevel,
  QuestionType
} from '../types'
import { generateId } from '../utils/helpers'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = (import.meta.env.VITE_GROQ_MODEL as string) || 'openai/gpt-oss-120b'
const GROQ_TIMEOUT_MS = 90_000
const GROQ_MAX_RETRIES = 3

export class AIProviderError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'AIProviderError'
  }
}

interface GroqOptions {
  temperature?: number
  maxTokens?: number
  json?: boolean
  signal?: AbortSignal
}

async function callGroq(
  apiKey: string,
  messages: { role: string; content: string }[],
  options: GroqOptions = {}
): Promise<string> {
  const {
    temperature = 0.3,
    maxTokens = 8000,
    json = false,
    signal: externalSignal,
  } = options

  let lastError: unknown

  for (let attempt = 0; attempt <= GROQ_MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS)
    const onExternalAbort = () => controller.abort()
    externalSignal?.addEventListener('abort', onExternalAbort)

    try {
      const body: Record<string, unknown> = {
        model: GROQ_MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
      }
      if (json) body.response_format = { type: 'json_object' }

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        let message = `Groq API error ${response.status}`
        try {
          const parsed = JSON.parse(errorText)
          message = parsed?.error?.message || message
        } catch {
          message = `${message}: ${errorText.slice(0, 300)}`
        }

        if (response.status === 401 || response.status === 403) {
          throw new AIProviderError('Invalid or missing Groq API key. Check VITE_GROQ_API_KEY.')
        }
        if (response.status === 404) {
          throw new AIProviderError(
            `Groq model "${GROQ_MODEL}" is unavailable. Set VITE_GROQ_MODEL to a valid model id.`
          )
        }
        if (response.status === 429) {
          throw new AIProviderError('Groq rate limit reached. Please wait a moment and try again.')
        }

        lastError = new AIProviderError(message)
        if (attempt < GROQ_MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 800 * (attempt + 1)))
          continue
        }
        throw lastError
      }

      const data = await response.json()
      const choice = data.choices?.[0]
      const content = choice?.message?.content

      if (!content) {
        const reason = choice?.finish_reason
        throw new AIProviderError(
          reason === 'length'
            ? 'The AI response was cut off before it finished. Try again or reduce the scope.'
            : 'The AI returned an empty response.'
        )
      }

      return content
    } catch (e) {
      if (e instanceof AIProviderError && /API key|unavailable|rate limit/i.test(e.message)) {
        throw e
      }
      lastError = e
      if (attempt < GROQ_MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 800 * (attempt + 1)))
        continue
      }
    } finally {
      clearTimeout(timeout)
      externalSignal?.removeEventListener('abort', onExternalAbort)
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.name === 'AbortError'
        ? 'The AI request timed out. Please try again.'
        : lastError.message
      : 'Unknown AI provider error'
  throw new AIProviderError(message, lastError)
}

function extractJSONBlock(text: string): string {
  const withoutFences = text.replace(/```(?:json|JSON)?\s*/g, '').replace(/```/g, '').trim()

  const firstBrace = withoutFences.indexOf('{')
  const firstBracket = withoutFences.indexOf('[')
  const start =
    firstBrace === -1 ? firstBracket : firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket)
  if (start === -1) return withoutFences

  const openChar = withoutFences[start]
  const closeChar = openChar === '{' ? '}' : ']'

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < withoutFences.length; i++) {
    const char = withoutFences[i]

    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (inString) continue

    if (char === openChar) depth++
    else if (char === closeChar) {
      depth--
      if (depth === 0) return withoutFences.slice(start, i + 1)
    }
  }

  return withoutFences.slice(start)
}

function parseJSON<T>(text: string): T {
  const cleaned = extractJSONBlock(text)
  try {
    return JSON.parse(cleaned) as T
  } catch {
    const repaired = repairedJSON(cleaned)
    if (repaired) return repaired as T
    throw new AIProviderError('The AI response was not valid JSON. Please try again.')
  }
}

function repairedJSON(text: string): unknown | null {
  const attempts = [
    text,
    text.replace(/,\s*([}\]])/g, '$1'),
    text.replace(/,\s*([}\]])/g, '$1').replace(/([{,]\s*)("?)((?:\\.|[^"\\])*)\2\s*:/g, '$1"$3":'),
  ]

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt)
    } catch {
      continue
    }
  }
  return null
}

const DEMO_COURSES: Record<string, Course> = {}

function createDemoCourse(input: CourseInput): Course {
  const courseId = generateId()
  const now = new Date().toISOString()
  
  const depthLessonCounts = { quick: 6, thorough: 12, mastery: 20 }
  const lessonCount = depthLessonCounts[input.depth]
  const totalMinutes = input.timePerDayMinutes * input.targetDurationDays
  const minutesPerLesson = Math.max(15, Math.floor(totalMinutes / lessonCount))
  
  const concepts: Concept[] = Array.from({ length: lessonCount * 2 }, (_, i) => ({
    id: `concept-${i}`,
    name: `Concept ${i + 1}`,
    description: `Description for concept ${i + 1}`,
    prerequisiteIds: i > 0 ? [`concept-${i - 1}`] : [],
    estimatedMinutes: minutesPerLesson,
    moduleId: `module-${Math.floor(i / 4)}`
  }))

  const modules: Module[] = Array.from({ length: Math.ceil(lessonCount / 4) }, (_, i) => ({
    id: `module-${i}`,
    courseId,
    title: `Module ${i + 1}: ${getModuleTitle(input.subject, i)}`,
    description: `Learn about ${getModuleTitle(input.subject, i).toLowerCase()}`,
    order: i,
    lessonIds: [],
    estimatedMinutes: minutesPerLesson * 4
  }))

  const lessons: Lesson[] = Array.from({ length: lessonCount }, (_, i) => {
    const moduleIndex = Math.floor(i / 4)
    const lessonId = `lesson-${i}`
    modules[moduleIndex].lessonIds.push(lessonId)
    
    return {
      id: lessonId,
      moduleId: modules[moduleIndex].id,
      title: `Lesson ${i + 1}: ${getLessonTitle(input.subject, i, input.depth)}`,
      description: `Learn ${getLessonTitle(input.subject, i, input.depth).toLowerCase()}`,
      order: i,
      estimatedMinutes: minutesPerLesson,
      concepts: concepts.slice(i * 2, i * 2 + 2).map(c => c.id),
      status: i === 0 ? 'available' : 'locked' as const,
    }
  })

  const dailySchedule: DailyScheduleItem[] = Array.from({ length: input.targetDurationDays }, (_, day) => {
    const lessonsPerDay = Math.max(1, Math.ceil(lessonCount / input.targetDurationDays))
    const startIdx = day * lessonsPerDay
    const dayLessons = lessons.slice(startIdx, startIdx + lessonsPerDay)
    return {
      day: day + 1,
      date: new Date(Date.now() + day * 86400000).toISOString().split('T')[0],
      lessonIds: dayLessons.map(l => l.id),
      estimatedMinutes: dayLessons.reduce((sum, l) => sum + l.estimatedMinutes, 0)
    }
  }).filter(d => d.lessonIds.length > 0)

  const course: Course = {
    id: courseId,
    userId: 'demo-user',
    input,
    title: `${input.subject} - ${capitalizeFirst(input.depth)} Track`,
    description: `A personalized ${input.depth} learning path for ${input.subject}, designed for ${input.knowledgeLevel} learners with ${input.timePerDayMinutes} minutes per day over ${input.targetDurationDays} days.`,
    learningObjectives: getLearningObjectives(input.subject, input.depth),
    prerequisites: getPrerequisites(input.subject, input.knowledgeLevel),
    modules,
    lessons,
    createdAt: now,
    updatedAt: now,
    totalEstimatedMinutes: lessons.reduce((sum, l) => sum + l.estimatedMinutes, 0),
    dailySchedule,
  }

  DEMO_COURSES[courseId] = course
  return course
}

function getModuleTitle(_subject: string, index: number): string {
  const templates = [
    'Foundations & Core Concepts',
    'Practical Applications',
    'Advanced Techniques',
    'Integration & Mastery',
    'Real-World Projects',
    'Expert Insights'
  ]
  return templates[index % templates.length]
}

function getLessonTitle(_subject: string, index: number, depth: DepthLevel): string {
  const prefixes = {
    quick: ['Introduction to', 'Core', 'Essential', 'Key', 'Fundamental', 'Basic'],
    thorough: ['Understanding', 'Deep Dive:', 'Mastering', 'Exploring', 'Building', 'Applying'],
    mastery: ['Advanced', 'Expert:', 'Professional', 'Architecting', 'Optimizing', 'Specialized']
  }
  const topics = [
    'Fundamentals', 'Core Principles', 'Key Techniques', 'Best Practices',
    'Common Patterns', 'Advanced Patterns', 'Performance', 'Testing',
    'Debugging', 'Deployment', 'Scaling', 'Maintenance'
  ]
  const prefix = prefixes[depth][index % prefixes[depth].length]
  const topic = topics[index % topics.length]
  return `${prefix} ${topic}`
}

function getLearningObjectives(subject: string, depth: DepthLevel): string[] {
  const base = [
    `Understand the fundamental concepts of ${subject}`,
    `Apply ${subject} principles to solve real problems`,
    `Build confidence in using ${subject} independently`
  ]
  if (depth === 'thorough' || depth === 'mastery') {
    base.push(`Analyze complex ${subject} scenarios`, `Design effective ${subject} solutions`)
  }
  if (depth === 'mastery') {
    base.push(`Optimize ${subject} implementations for performance`, `Teach ${subject} concepts to others`)
  }
  return base
}

function getPrerequisites(subject: string, level: string): string[] {
  if (level === 'beginner') return ['No prior experience required', 'Basic computer literacy']
  if (level === 'intermediate') return [`Basic ${subject} knowledge`, 'Familiarity with core concepts']
  return [`Strong ${subject} foundation`, 'Experience with advanced topics']
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function generateDemoLessonContent(lesson: Lesson, context: LessonGenerationContext): LessonContent {
  const conceptNames = lesson.concepts.map((_, i) => `Concept ${i + 1}`)
  return {
    objectives: [
      `Understand ${lesson.title.toLowerCase()}`,
      `Apply key techniques from this lesson`,
      `Identify common pitfalls and best practices`
    ],
    notes: `This lesson covers ${lesson.title.toLowerCase()}. ${conceptNames.join(', ')} are the core concepts you'll master.`,
    detailedExplanation: `${lesson.title} is a fundamental building block in ${context.courseTitle}. 

In this lesson, we'll explore ${conceptNames.join(' and ')} in depth. These concepts form the foundation for more advanced topics in later modules.

Key points to remember:
1. ${conceptNames[0]} provides the basic structure
2. ${conceptNames[1] || 'Related concepts'} extend this foundation
3. Practice with the worked examples to solidify understanding

The estimated study time is ${lesson.estimatedMinutes} minutes. Take your time with the exercises - mastery comes from practice, not just reading.`,
    analogies: [
      `Think of ${conceptNames[0]} like a blueprint - it defines the structure without specifying every detail.`,
      `Like learning to drive: ${conceptNames[1] || 'the next concept'} is like learning to navigate traffic after mastering basic controls.`
    ],
    workedExamples: [
      {
        title: `Example: Basic ${conceptNames[0]}`,
        problem: `How to implement a simple ${conceptNames[0].toLowerCase()}?`,
        solution: `// Basic implementation\nfunction basic${conceptNames[0].replace(/\s+/g, '')}() {\n  return "Hello, ${conceptNames[0]}!";\n}`,
        explanation: 'This shows the minimal structure needed. Notice how simple the core concept is.'
      },
      {
        title: `Example: Applying ${conceptNames[1] || conceptNames[0]}`,
        problem: `How to use ${conceptNames[1]?.toLowerCase() || conceptNames[0].toLowerCase()} in practice?`,
        solution: `// Practical usage\nconst result = apply${conceptNames[1]?.replace(/\s+/g, '') || conceptNames[0].replace(/\s+/g, '')}(\n  input,\n  options\n);`,
        explanation: 'Real-world usage requires handling edge cases and configuration options.'
      }
    ],
    keyTerms: conceptNames.map(name => ({
      term: name,
      definition: `A core concept in ${context.courseTitle} that represents ${name.toLowerCase()}.`
    })),
    diagrams: [
      {
        id: `diagram-${lesson.id}`,
        title: `${lesson.title} Overview`,
        mermaidCode: `graph TD
    A[${conceptNames[0]}] --> B[${conceptNames[1] || 'Next Concept'}]
    A --> C[Practice]
    B --> D[Mastery]
    C --> D`,
        description: `Relationship between ${conceptNames.join(' and ')}`
      }
    ],
    takeaways: [
      `${conceptNames[0]} is the foundation for everything that follows`,
      `Practice the worked examples before moving on`,
      `Review the key terms - they'll appear in the quiz`
    ]
  }
}

function generateDemoQuiz(lesson: Lesson, context: QuizGenerationContext): Quiz {
  const questions: QuizQuestion[] = [
    {
      id: generateId(),
      type: 'multiple-choice',
      question: `What is the primary purpose of ${lesson.concepts[0] || 'the first concept'} in ${context.lesson.title}?`,
      options: [
        'To provide a foundational structure',
        'To replace all other concepts',
        'To complicate the learning process',
        'To serve as an optional addon'
      ],
      correctAnswer: 'To provide a foundational structure',
      explanation: 'The first concept establishes the base upon which all other concepts build.',
      conceptIds: [lesson.concepts[0] || ''],
      difficulty: 1
    },
    {
      id: generateId(),
      type: 'multiple-choice',
      question: `Which of the following best describes the relationship between concepts in this lesson?`,
      options: [
        'They are completely independent',
        'Each builds upon the previous',
        'They conflict with each other',
        'Order does not matter'
      ],
      correctAnswer: 'Each builds upon the previous',
      explanation: 'Concepts in this curriculum are designed to build progressively.',
      conceptIds: lesson.concepts,
      difficulty: 2
    },
    {
      id: generateId(),
      type: 'multiple-select',
      question: `Select all that apply: What are key takeaways from this lesson?`,
      options: [
        'Practice is essential for mastery',
        'Concepts build on each other',
        'Memorization is sufficient',
        'Review key terms regularly'
      ],
      correctAnswer: ['Practice is essential for mastery', 'Concepts build on each other', 'Review key terms regularly'],
      explanation: 'Active practice and regular review lead to lasting retention.',
      conceptIds: lesson.concepts,
      difficulty: 2
    },
    {
      id: generateId(),
      type: 'short-answer',
      question: `In your own words, explain how you would apply ${lesson.concepts[0] || 'the main concept'} to a real problem.`,
      options: undefined,
      correctAnswer: 'Any reasonable application demonstrating understanding',
      explanation: 'There are many valid applications. The key is showing you understand the concept.',
      conceptIds: [lesson.concepts[0] || ''],
      difficulty: 3
    }
  ]

  return {
    id: generateId(),
    lessonId: lesson.id,
    questions,
    passingScore: 70,
    timeLimitMinutes: 10
  }
}

export class DemoAIProvider implements AIProvider {
  async generateCurriculum(input: CourseInput): Promise<Course> {
    await new Promise(r => setTimeout(r, 1500))
    return createDemoCourse(input)
  }

  async generateLesson(courseId: string, lessonId: string, context: LessonGenerationContext): Promise<LessonContent> {
    await new Promise(r => setTimeout(r, 800))
    const course = DEMO_COURSES[courseId]
    const lesson = course?.lessons.find(l => l.id === lessonId)
    if (!lesson) throw new Error('Lesson not found')
    return generateDemoLessonContent(lesson, context)
  }

  async generateQuiz(lesson: Lesson, context: QuizGenerationContext): Promise<Quiz> {
    await new Promise(r => setTimeout(r, 600))
    return generateDemoQuiz(lesson, context)
  }

  async simplifyExplanation(text: string, concept: string): Promise<string> {
    await new Promise(r => setTimeout(r, 500))
    return `Simplified: ${text.split('.')[0]}. Think of ${concept} like a simple analogy - it's the core idea without the complex details.`
  }

  async generateWorkedExample(concept: string, _context: string): Promise<WorkedExample> {
    await new Promise(r => setTimeout(r, 500))
    return {
      title: `Additional Example: ${concept}`,
      problem: `How to apply ${concept} in a different context?`,
      solution: `// Alternative approach\nfunction alternative${concept.replace(/\s+/g, '')}() {\n  // Different implementation\n  return "Alternative result";\n}`,
      explanation: 'This shows a different way to think about the same concept.'
    }
  }
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(v => v != null).map(v => String(v))
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

function asNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

function normalizeCourse(raw: Partial<Course>, input: CourseInput): Course {
  const now = new Date().toISOString()
  const courseId = generateId()

  const rawModules = Array.isArray(raw.modules) ? raw.modules : []
  const rawLessons = Array.isArray(raw.lessons) ? raw.lessons : []

  const modules: Module[] = rawModules.map((m, index) => ({
    id: String(m?.id || `module-${index + 1}`),
    courseId,
    title: String(m?.title || `Module ${index + 1}`),
    description: String(m?.description || ''),
    order: asNumber(m?.order, index),
    lessonIds: asStringArray(m?.lessonIds),
    estimatedMinutes: asNumber(m?.estimatedMinutes, 0),
  }))

  const lessons: Lesson[] = rawLessons.map((l, index) => ({
    id: String(l?.id || `lesson-${index + 1}`),
    moduleId: String(l?.moduleId || modules[0]?.id || `module-1`),
    title: String(l?.title || `Lesson ${index + 1}`),
    description: String(l?.description || ''),
    order: asNumber(l?.order, index),
    estimatedMinutes: asNumber(l?.estimatedMinutes, Math.max(10, Math.floor(input.timePerDayMinutes))),
    concepts: asStringArray(l?.concepts),
    status: 'locked',
  }))

  if (lessons.length === 0) {
    throw new AIProviderError('The AI did not return any lessons. Please try again.')
  }

  lessons.forEach((lesson, index) => {
    if (index === 0) lesson.status = 'available'
  })

  const moduleLessonIds = new Map<string, string[]>()
  for (const lesson of lessons) {
    const list = moduleLessonIds.get(lesson.moduleId) || []
    list.push(lesson.id)
    moduleLessonIds.set(lesson.moduleId, list)
  }
  for (const module of modules) {
    module.lessonIds = moduleLessonIds.get(module.id) || module.lessonIds
  }
  if (modules.length > 0) {
    const knownModuleIds = new Set(modules.map(m => m.id))
    for (const lesson of lessons) {
      if (!knownModuleIds.has(lesson.moduleId)) {
        lesson.moduleId = modules[0].id
        modules[0].lessonIds.push(lesson.id)
      }
    }
  }

  const totalFromLessons = lessons.reduce((sum, l) => sum + l.estimatedMinutes, 0)
  const totalEstimatedMinutes = asNumber(
    raw.totalEstimatedMinutes,
    totalFromLessons || input.timePerDayMinutes * input.targetDurationDays
  )

  const rawSchedule = Array.isArray(raw.dailySchedule) ? raw.dailySchedule : []
  const dailySchedule: DailyScheduleItem[] = rawSchedule
    .map((d, index) => ({
      day: asNumber(d?.day, index + 1),
      date: String(d?.date || new Date(Date.now() + index * 86400000).toISOString().split('T')[0]),
      lessonIds: asStringArray(d?.lessonIds).filter(id => lessons.some(l => l.id === id)),
      estimatedMinutes: asNumber(d?.estimatedMinutes, 0),
    }))
    .filter(d => d.lessonIds.length > 0)

  if (dailySchedule.length === 0) {
    const lessonsPerDay = Math.max(1, Math.ceil(lessons.length / input.targetDurationDays))
    for (let day = 0; day < input.targetDurationDays; day++) {
      const dayLessons = lessons.slice(day * lessonsPerDay, (day + 1) * lessonsPerDay)
      if (dayLessons.length === 0) break
      dailySchedule.push({
        day: day + 1,
        date: new Date(Date.now() + day * 86400000).toISOString().split('T')[0],
        lessonIds: dayLessons.map(l => l.id),
        estimatedMinutes: dayLessons.reduce((sum, l) => sum + l.estimatedMinutes, 0),
      })
    }
  }

  return {
    id: courseId,
    userId: 'demo-user',
    input,
    title: String(raw.title || `${input.subject} Learning Path`),
    description: String(raw.description || ''),
    learningObjectives: asStringArray(raw.learningObjectives),
    prerequisites: asStringArray(raw.prerequisites),
    modules,
    lessons,
    createdAt: now,
    updatedAt: now,
    totalEstimatedMinutes,
    dailySchedule,
  }
}

function normalizeLessonContent(raw: Partial<LessonContent>): LessonContent {
  const workedExamples = (Array.isArray(raw.workedExamples) ? raw.workedExamples : []).map(w => ({
    title: String(w?.title || 'Worked Example'),
    problem: String(w?.problem || ''),
    solution: String(w?.solution || ''),
    explanation: String(w?.explanation || ''),
  }))

  const keyTerms = (Array.isArray(raw.keyTerms) ? raw.keyTerms : []).map(t => ({
    term: String(t?.term || ''),
    definition: String(t?.definition || ''),
  }))

  const diagrams = (Array.isArray(raw.diagrams) ? raw.diagrams : []).map((d, index) => ({
    id: String(d?.id || `diagram-${index + 1}`),
    title: String(d?.title || `Diagram ${index + 1}`),
    mermaidCode: String(d?.mermaidCode || ''),
    description: String(d?.description || ''),
  }))

  return {
    objectives: asStringArray(raw.objectives),
    notes: String(raw.notes || ''),
    detailedExplanation: String(raw.detailedExplanation || ''),
    analogies: asStringArray(raw.analogies),
    workedExamples,
    keyTerms,
    diagrams,
    takeaways: asStringArray(raw.takeaways),
  }
}

function normalizeQuiz(raw: Partial<Quiz>, lessonId: string): Quiz {
  const questions = (Array.isArray(raw.questions) ? raw.questions : [])
    .map((q, index) => {
      const type = (q?.type as QuestionType) || 'multiple-choice'
      const options = asStringArray(q?.options)
      const correctAnswer = q?.correctAnswer

      let normalizedAnswer: string | string[]
      if (Array.isArray(correctAnswer)) {
        normalizedAnswer = correctAnswer.map(String)
      } else if (typeof correctAnswer === 'number') {
        normalizedAnswer = String(correctAnswer)
      } else {
        normalizedAnswer = String(correctAnswer ?? '')
      }

      return {
        id: String(q?.id || `q-${index + 1}`),
        type,
        question: String(q?.question || ''),
        options: options.length ? options : undefined,
        correctAnswer: normalizedAnswer,
        explanation: String(q?.explanation || ''),
        conceptIds: asStringArray(q?.conceptIds),
        difficulty: asNumber(q?.difficulty, 3),
      }
    })
    .filter(q => q.question.length > 0)

  if (questions.length === 0) {
    throw new AIProviderError('The AI did not return any quiz questions. Please try again.')
  }

  return {
    id: generateId(),
    lessonId,
    questions,
    passingScore: asNumber(raw.passingScore, 70),
    timeLimitMinutes: raw.timeLimitMinutes ? asNumber(raw.timeLimitMinutes, 15) : undefined,
  }
}

export function createAIProvider(config: AIProviderConfig): AIProvider {
  if (config.provider === 'demo' || !config.apiKey) {
    return new DemoAIProvider()
  }
  
  if (config.provider === 'groq') {
    return new GroqAIProvider(config)
  }
  
  if (config.provider === 'firebase') {
    return new FirebaseAIProvider(config)
  }
  
  if (config.provider === 'cloudflare') {
    return new CloudflareAIProvider(config)
  }
  
  return new DemoAIProvider()
}

class GroqAIProvider implements AIProvider {
  private apiKey: string
  
  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey!
  }

  async generateCurriculum(input: CourseInput): Promise<Course> {
    const prompt = this.buildCurriculumPrompt(input)
    const response = await callGroq(this.apiKey, [
      { role: 'system', content: 'You are an expert curriculum designer. Respond with a single valid JSON object and nothing else.' },
      { role: 'user', content: prompt }
    ], { temperature: 0.3, maxTokens: 12000, json: true })

    const data = parseJSON<Partial<Course>>(response)
    return normalizeCourse(data, input)
  }

  async generateLesson(_courseId: string, _lessonId: string, context: LessonGenerationContext): Promise<LessonContent> {
    const prompt = this.buildLessonPrompt(context)
    const response = await callGroq(this.apiKey, [
      { role: 'system', content: 'You are an expert educator. Create detailed lesson content. Respond with a single valid JSON object and nothing else.' },
      { role: 'user', content: prompt }
    ], { temperature: 0.4, maxTokens: 12000, json: true })

    return normalizeLessonContent(parseJSON<Partial<LessonContent>>(response))
  }

  async generateQuiz(lesson: Lesson, context: QuizGenerationContext): Promise<Quiz> {
    const prompt = this.buildQuizPrompt(lesson, context)
    const response = await callGroq(this.apiKey, [
      { role: 'system', content: 'You are an expert assessment designer. Create fair, accurate quizzes. Respond with a single valid JSON object and nothing else.' },
      { role: 'user', content: prompt }
    ], { temperature: 0.3, maxTokens: 8000, json: true })

    const data = parseJSON<Partial<Quiz>>(response)
    return normalizeQuiz(data, lesson.id)
  }

  async simplifyExplanation(text: string, concept: string): Promise<string> {
    const response = await callGroq(this.apiKey, [
      { role: 'system', content: 'Simplify complex explanations for learners. Be concise and use analogies.' },
      { role: 'user', content: `Simplify this explanation of "${concept}":\n\n${text}` }
    ], { temperature: 0.5, maxTokens: 2000 })

    return response.trim()
  }

  async generateWorkedExample(concept: string, context: string): Promise<WorkedExample> {
    const response = await callGroq(this.apiKey, [
      { role: 'system', content: 'Create clear worked examples with problem, solution, and explanation. Respond with a single valid JSON object and nothing else.' },
      { role: 'user', content: `Create a worked example for "${concept}" in the context of: ${context}` }
    ], { temperature: 0.4, maxTokens: 4000, json: true })

    const data = parseJSON<Partial<WorkedExample>>(response)
    return {
      title: data.title || `Worked Example: ${concept}`,
      problem: data.problem || '',
      solution: data.solution || '',
      explanation: data.explanation || '',
    }
  }

  private buildCurriculumPrompt(input: CourseInput): string {
    const totalMinutes = input.timePerDayMinutes * input.targetDurationDays
    const depthGuide = {
      quick: 'Core concepts only, minimal practice, 3-5 questions per quiz',
      thorough: 'Detailed explanations, worked examples, practice exercises, 5-8 questions per quiz',
      mastery: 'Deep theory, implementation exercises, projects, comprehensive quizzes, final challenge'
    }
    
    return `Create a structured learning curriculum for "${input.subject}".

Learner Profile:
- Current level: ${input.knowledgeLevel}
- Time per day: ${input.timePerDayMinutes} minutes
- Duration: ${input.targetDurationDays} days (${totalMinutes} minutes total)
- Depth: ${input.depth} - ${depthGuide[input.depth]}
- Preferred formats: ${input.preferredFormats.join(', ')}

Output JSON with this exact structure:
{
  "title": "Course title",
  "description": "2-3 sentence description",
  "learningObjectives": ["objective1", "objective2", "objective3"],
  "prerequisites": ["prereq1", "prereq2"],
  "modules": [
    {
      "id": "module-1",
      "title": "Module title",
      "description": "Module description",
      "order": 0,
      "lessonIds": ["lesson-1", "lesson-2"],
      "estimatedMinutes": 60
    }
  ],
  "lessons": [
    {
      "id": "lesson-1",
      "moduleId": "module-1",
      "title": "Lesson title",
      "description": "Lesson description",
      "order": 0,
      "estimatedMinutes": 30,
      "concepts": ["concept-1", "concept-2"],
      "status": "available"
    }
  ],
  "dailySchedule": [
    {
      "day": 1,
      "date": "2024-01-15",
      "lessonIds": ["lesson-1"],
      "estimatedMinutes": 30
    }
  ]
}

Rules:
- Total lesson time ≈ ${totalMinutes} minutes
- Lessons per day based on ${input.timePerDayMinutes} min/day
- Status: first lesson "available", rest "locked"
- Generate realistic concepts for each lesson
- Include mermaid diagram code in lessons where helpful
- Make it progressive (prerequisites first)
- Every lesson id in "lessons" must appear in exactly one module's "lessonIds"
- Use ids like "module-1", "lesson-1" consistently`
  }

  private buildLessonPrompt(context: LessonGenerationContext): string {
    return `Create detailed lesson content for "${context.lessonTitle}" (Module: ${context.moduleTitle}, Course: ${context.courseTitle}).

Concepts to cover: ${context.concepts.map(c => c.name).join(', ')}
Depth: ${context.depth}
Preferred formats: ${context.preferredFormats.join(', ')}

Output JSON with this exact structure:
{
  "objectives": ["objective1", "objective2", "objective3"],
  "notes": "Concise summary (2-3 paragraphs)",
  "detailedExplanation": "Comprehensive explanation with examples (4-6 paragraphs)",
  "analogies": ["analogy1", "analogy2"],
  "workedExamples": [
    {
      "title": "Example title",
      "problem": "Problem statement",
      "solution": "Step-by-step solution with code/formulas",
      "explanation": "Why this works"
    }
  ],
  "keyTerms": [
    { "term": "Term", "definition": "Clear definition" }
  ],
  "diagrams": [
    {
      "id": "diagram-1",
      "title": "Diagram title",
      "mermaidCode": "flowchart TD\\n    A[Concept] --> B[Next]",
      "description": "What this shows"
    }
  ],
  "takeaways": ["takeaway1", "takeaway2", "takeaway3"]
}

Rules:
- Include mermaid diagrams only when they clarify concepts
- mermaidCode must use flowchart syntax starting with "flowchart TD" and only node/edge syntax
- Worked examples must be practical and runnable
- Match depth level: ${context.depth}
- No markdown formatting in JSON strings`
  }

  private buildQuizPrompt(lesson: Lesson, context: QuizGenerationContext): string {
    return `Create a quiz for lesson "${lesson.title}".

Concepts tested: ${context.concepts.map(c => c.name).join(', ')}
Depth: ${context.depth}
Question count: ${context.questionCount}

Output JSON with this exact structure:
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "question": "Question text?",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "Why A is correct",
      "conceptIds": ["concept-1"],
      "difficulty": 1
    },
    {
      "id": "q2",
      "type": "multiple-select",
      "question": "Select all that apply:",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": ["A", "C"],
      "explanation": "Why A and C",
      "conceptIds": ["concept-1", "concept-2"],
      "difficulty": 2
    },
    {
      "id": "q3",
      "type": "short-answer",
      "question": "Explain how to...",
      "correctAnswer": "Key concepts that must appear in answer",
      "explanation": "What a good answer covers",
      "conceptIds": ["concept-1"],
      "difficulty": 3
    }
  ],
  "passingScore": 70,
  "timeLimitMinutes": 10
}

Rules:
- Mix question types (multiple-choice, multiple-select, short-answer)
- Each question maps to specific conceptIds from: ${context.concepts.map(c => c.id).join(', ') || 'the lesson concepts'}
- Difficulty 1-3 based on depth
- For multiple-choice and multiple-select, "correctAnswer" must exactly match the option text (not the letter)
- For short-answer, "correctAnswer" must be a short list of key terms separated by commas that a correct answer would contain
- Correct answers must be unambiguous for auto-grading`
  }
}

class FirebaseAIProvider implements AIProvider {
  constructor(_config: AIProviderConfig) {
    // Config stored for future use
    void _config
  }

  async generateCurriculum(_input: CourseInput): Promise<Course> {
    throw new Error('Firebase AI not configured - using demo mode')
  }

  async generateLesson(_courseId: string, _lessonId: string, _context: LessonGenerationContext): Promise<LessonContent> {
    throw new Error('Firebase AI not configured - using demo mode')
  }

  async generateQuiz(_lesson: Lesson, _context: QuizGenerationContext): Promise<Quiz> {
    throw new Error('Firebase AI not configured - using demo mode')
  }

  async simplifyExplanation(_text: string, _concept: string): Promise<string> {
    throw new Error('Firebase AI not configured - using demo mode')
  }

  async generateWorkedExample(_concept: string, _context: string): Promise<WorkedExample> {
    throw new Error('Firebase AI not configured - using demo mode')
  }
}

class CloudflareAIProvider implements AIProvider {
  constructor(_config: AIProviderConfig) {
    // Config stored for future use
    void _config
  }

  async generateCurriculum(_input: CourseInput): Promise<Course> {
    throw new Error('Cloudflare AI not configured - using demo mode')
  }

  async generateLesson(_courseId: string, _lessonId: string, _context: LessonGenerationContext): Promise<LessonContent> {
    throw new Error('Cloudflare AI not configured - using demo mode')
  }

  async generateQuiz(_lesson: Lesson, _context: QuizGenerationContext): Promise<Quiz> {
    throw new Error('Cloudflare AI not configured - using demo mode')
  }

  async simplifyExplanation(_text: string, _concept: string): Promise<string> {
    throw new Error('Cloudflare AI not configured - using demo mode')
  }

  async generateWorkedExample(_concept: string, _context: string): Promise<WorkedExample> {
    throw new Error('Cloudflare AI not configured - using demo mode')
  }
}