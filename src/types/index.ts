export type KnowledgeLevel = 'beginner' | 'intermediate' | 'advanced'
export type DepthLevel = 'quick' | 'thorough' | 'mastery'
export type LearningFormat = 'text' | 'diagrams' | 'audio' | 'practice'
export type LessonStatus = 'locked' | 'available' | 'in-progress' | 'completed'
export type QuestionType = 'multiple-choice' | 'multiple-select' | 'short-answer'

export interface UserProfile {
  id: string
  name?: string
  email?: string
  isAnonymous: boolean
  createdAt: string
  preferences?: {
    defaultTimePerDay: number
    defaultDepth: DepthLevel
    preferredFormats: LearningFormat[]
  }
}

export interface CourseInput {
  subject: string
  knowledgeLevel: KnowledgeLevel
  timePerDayMinutes: number
  targetDurationDays: number
  depth: DepthLevel
  preferredFormats: LearningFormat[]
}

export interface Concept {
  id: string
  name: string
  description: string
  prerequisiteIds: string[]
  estimatedMinutes: number
  moduleId: string
}

export interface Lesson {
  id: string
  moduleId: string
  title: string
  description: string
  order: number
  estimatedMinutes: number
  concepts: string[]
  status: LessonStatus
  content?: LessonContent
  quiz?: Quiz
}

export interface LessonContent {
  objectives: string[]
  notes: string
  detailedExplanation: string
  analogies: string[]
  workedExamples: WorkedExample[]
  keyTerms: KeyTerm[]
  diagrams: Diagram[]
  takeaways: string[]
}

export interface WorkedExample {
  title: string
  problem: string
  solution: string
  explanation: string
}

export interface KeyTerm {
  term: string
  definition: string
}

export interface Diagram {
  id: string
  title: string
  mermaidCode: string
  description: string
}

export interface Module {
  id: string
  courseId: string
  title: string
  description: string
  order: number
  lessonIds: string[]
  estimatedMinutes: number
}

export interface Course {
  id: string
  userId: string
  input: CourseInput
  title: string
  description: string
  learningObjectives: string[]
  prerequisites: string[]
  modules: Module[]
  lessons: Lesson[]
  createdAt: string
  updatedAt: string
  totalEstimatedMinutes: number
  dailySchedule: DailyScheduleItem[]
}

export interface DailyScheduleItem {
  day: number
  date: string
  lessonIds: string[]
  estimatedMinutes: number
}

export interface QuizQuestion {
  id: string
  type: QuestionType
  question: string
  options?: string[]
  correctAnswer: string | string[]
  explanation: string
  conceptIds: string[]
  difficulty: number
}

export interface Quiz {
  id: string
  lessonId: string
  questions: QuizQuestion[]
  passingScore: number
  timeLimitMinutes?: number
}

export interface QuizAttempt {
  id: string
  quizId: string
  lessonId: string
  userId: string
  answers: Record<string, string | string[]>
  score: number
  passed: boolean
  conceptScores: Record<string, number>
  startedAt: string
  completedAt: string
  timeSpentSeconds: number
}

export interface ConceptMastery {
  conceptId: string
  userId: string
  courseId: string
  accuracy: number
  attempts: number
  lastAttemptAt: string
  status: 'not-studied' | 'learning' | 'needs-revision' | 'proficient' | 'mastered'
  nextReviewAt?: string
}

export interface StudySession {
  id: string
  userId: string
  courseId: string
  lessonId: string
  startedAt: string
  endedAt?: string
  durationMinutes: number
  completed: boolean
}

export interface RevisionRecommendation {
  conceptId: string
  reason: string
  priority: 'high' | 'medium' | 'low'
  suggestedLessonId?: string
}

export interface AdaptiveRecommendation {
  type: 'next-lesson' | 'revision' | 'prerequisite-review' | 'harder-exercise'
  lessonId?: string
  conceptIds: string[]
  reason: string
  confidence: number
}

export interface ProgressSnapshot {
  courseId: string
  userId: string
  lessonsCompleted: number
  totalLessons: number
  totalStudyMinutes: number
  averageQuizScore: number
  strongConcepts: string[]
  weakConcepts: string[]
  currentStreak: number
  longestStreak: number
  lastStudyDate?: string
  nextRecommendedAction?: AdaptiveRecommendation
}

export interface AIProvider {
  generateCurriculum(input: CourseInput): Promise<Course>
  generateLesson(courseId: string, lessonId: string, context: LessonGenerationContext): Promise<LessonContent>
  generateQuiz(lesson: Lesson, context: QuizGenerationContext): Promise<Quiz>
  simplifyExplanation(text: string, concept: string): Promise<string>
  generateWorkedExample(concept: string, context: string): Promise<WorkedExample>
}

export interface LessonGenerationContext {
  courseTitle: string
  moduleTitle: string
  lessonTitle: string
  concepts: Concept[]
  previousLessons: Lesson[]
  depth: DepthLevel
  preferredFormats: LearningFormat[]
}

export interface QuizGenerationContext {
  lesson: Lesson
  concepts: Concept[]
  depth: DepthLevel
  questionCount: number
}

export interface AIProviderConfig {
  provider: 'groq' | 'firebase' | 'cloudflare' | 'demo'
  apiKey?: string
  model?: string
  maxRetries: number
  timeoutMs: number
}

export type AppView = 'landing' | 'wizard' | 'dashboard' | 'lesson' | 'quiz' | 'progress' | 'results'

export interface AppState {
  view: AppView
  user: UserProfile | null
  course: Course | null
  currentLesson: Lesson | null
  currentQuiz: Quiz | null
  quizAttempt: QuizAttempt | null
  isGenerating: boolean
  error: string | null
}