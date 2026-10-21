import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { 
  AppView, 
  Course, 
  Quiz, 
  QuizAttempt,
  AppState,
  CourseInput
} from '../types'
import { demoStorage, getOrCreateUser, calculateProgressSnapshot } from '../lib/storage'
import { createAIProvider } from '../lib/ai-provider'
import { createAdaptiveEngine, initializeConceptMastery } from '../lib/adaptive-engine'
import { getAIConfig } from '../lib/secret'
import {
  loadSession,
  saveSession,
  authenticate,
  registerAccount,
  createDemoSession,
  sessionToUser,
} from '../lib/auth'
import type { AuthSession, RegisterInput, RegisterResult } from '../lib/auth'
import type { AIProviderConfig } from '../types'

const AI_CONFIG: AIProviderConfig = getAIConfig()

interface AppContextType extends AppState {
  setView: (view: AppView) => void
  setError: (error: string | null) => void
  initializeApp: () => Promise<void>
  authSession: AuthSession | null
  isAuthenticated: boolean
  signIn: (email: string, password: string) => boolean
  register: (input: RegisterInput) => RegisterResult
  continueAsDemo: () => void
  signOut: () => void
  startCourse: (input: CourseInput) => Promise<void>
  loadCourse: (courseId: string) => Promise<void>
  selectLesson: (lessonId: string) => Promise<void>
  completeLesson: (lessonId: string) => void
  startQuiz: (quiz: Quiz) => void
  startQuizForLesson: (lessonId: string) => Promise<void>
  submitQuiz: (answers: Record<string, string | string[]>) => Promise<void>
  retryQuiz: () => void
  getProgressSnapshot: () => ReturnType<typeof calculateProgressSnapshot> | null
  getRecommendations: () => ReturnType<typeof import('../lib/adaptive-engine').AdaptiveEngine.prototype.getRecommendations>
  generateLessonContent: (lessonId: string) => Promise<void>
  simplifyExplanation: (text: string, concept: string) => Promise<string>
  generateWorkedExample: (concept: string, context: string) => Promise<import('../types').WorkedExample>
}

const AppContext = createContext<AppContextType | null>(null)

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are',
  'was', 'were', 'be', 'been', 'it', 'its', 'as', 'at', 'by', 'that', 'this', 'these',
  'those', 'from', 'can', 'will', 'would', 'should', 'could', 'may', 'might', 'must',
  'if', 'then', 'than', 'so', 'such', 'not', 'no', 'do', 'does', 'did', 'has', 'have',
  'had', 'you', 'your', 'they', 'their', 'we', 'our', 'i', 'he', 'she', 'his', 'her',
])

function gradeShortAnswer(userAnswer: string, correctAnswer: string | string[]): boolean {
  const user = normalizeText(userAnswer)
  if (!user) return false

  const expectedList = Array.isArray(correctAnswer)
    ? correctAnswer
    : String(correctAnswer)
        .split(/[,;/]|\band\b/i)
        .map(s => s.trim())
        .filter(Boolean)

  const keywords = expectedList
    .flatMap(entry => normalizeText(entry).split(' '))
    .filter(word => word.length > 2 && !STOP_WORDS.has(word))

  if (keywords.length === 0) {
    return user.split(' ').length >= 3
  }

  const userWords = new Set(user.split(' '))
  const matched = keywords.filter(word => userWords.has(word)).length
  const required = Math.max(1, Math.ceil(keywords.length * 0.6))
  return matched >= required
}

function buildLessonContext(course: Course, lesson: Course['lessons'][number]) {
  return {
    courseTitle: course.title,
    moduleTitle: course.modules.find(m => m.id === lesson.moduleId)?.title || '',
    lessonTitle: lesson.title,
    concepts: lesson.concepts.map(name => ({
      id: name,
      name: name,
      description: '',
      prerequisiteIds: [] as string[],
      estimatedMinutes: Math.max(5, Math.floor(lesson.estimatedMinutes / Math.max(1, lesson.concepts.length))),
      moduleId: lesson.moduleId,
    })),
    previousLessons: course.lessons.filter(l => l.order < lesson.order),
    depth: course.input.depth,
    preferredFormats: course.input.preferredFormats,
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [state, setState] = useState<AppState>({
    view: 'landing',
    user: null,
    course: null,
    currentLesson: null,
    currentQuiz: null,
    quizAttempt: null,
    isGenerating: false,
    error: null
  })
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => loadSession())

  const aiProvider = createAIProvider(AI_CONFIG)
  const adaptiveEngine = createAdaptiveEngine()

  const applySession = useCallback((session: AuthSession) => {
    saveSession(session)
    setAuthSession(session)
    setState(prev => ({ ...prev, user: sessionToUser(session, prev.user) }))
    demoStorage.setUser(sessionToUser(session, demoStorage.getUser()))
  }, [])

  const signIn = useCallback((email: string, password: string) => {
    const session = authenticate(email, password)
    if (!session) return false
    applySession(session)
    return true
  }, [applySession])

  const register = useCallback((input: RegisterInput): RegisterResult => {
    const result = registerAccount(input)
    if (result.ok && result.session) applySession(result.session)
    return result
  }, [applySession])

  const continueAsDemo = useCallback(() => {
    applySession(createDemoSession())
  }, [applySession])

  const signOut = useCallback(() => {
    saveSession(null)
    setAuthSession(null)
    setState(prev => ({ ...prev, user: null }))
  }, [])

  const setView = useCallback((view: AppView) => {
    setState(prev => ({ ...prev, view, error: null }))
    if (view === 'progress') navigate('/progress')
    else if (view === 'dashboard') navigate('/dashboard')
  }, [navigate])

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }))
  }, [])

  const initializeApp = useCallback(async () => {
    setState(prev => ({ ...prev, isGenerating: true }))
    try {
      const session = loadSession()
      const user = session
        ? sessionToUser(session, demoStorage.getUser())
        : getOrCreateUser()
      const currentCourseId = demoStorage.getCurrentCourseId()
      
      let course: Course | null = null
      if (currentCourseId) {
        course = demoStorage.getCourse(currentCourseId)
      }
      
      setState(prev => ({ 
        ...prev, 
        user, 
        course,
        isGenerating: false 
      }))
    } catch (e) {
      setState(prev => ({ 
        ...prev, 
        isGenerating: false,
        error: 'Failed to initialize app' 
      }))
    }
  }, [])

  const startCourse = useCallback(async (input: CourseInput) => {
    setState(prev => ({ ...prev, isGenerating: true, error: null }))
    try {
      const course = await aiProvider.generateCurriculum(input)
      demoStorage.saveCourse(course)
      demoStorage.setCurrentCourseId(course.id)
      
      initializeConceptMastery(course)
      
      setState(prev => ({ 
        ...prev, 
        course,
        currentLesson: course.lessons[0],
        view: 'dashboard',
        isGenerating: false 
      }))
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to generate curriculum'
      setState(prev => ({ 
        ...prev, 
        isGenerating: false,
        error: message
      }))
      throw e
    }
  }, [])

  const loadCourse = useCallback(async (courseId: string) => {
    setState(prev => ({ ...prev, isGenerating: true }))
    try {
      const course = demoStorage.getCourse(courseId)
      if (!course) throw new Error('Course not found')
      
      demoStorage.setCurrentCourseId(courseId)
      
      setState(prev => ({ 
        ...prev, 
        course,
        currentLesson: course.lessons.find(l => l.status === 'in-progress') || course.lessons.find(l => l.status === 'available') || null,
        view: 'dashboard',
        isGenerating: false 
      }))
    } catch (e) {
      setState(prev => ({ 
        ...prev, 
        isGenerating: false,
        error: 'Failed to load course' 
      }))
    }
  }, [])

  const selectLesson = useCallback(async (lessonId: string) => {
    const { course } = state
    if (!course) return
    
    setState(prev => ({ ...prev, isGenerating: true }))
    try {
      const foundLesson = course.lessons.find(l => l.id === lessonId)
      if (!foundLesson) throw new Error('Lesson not found')
      let lesson = foundLesson
      
      if (!lesson.content) {
        const content = await aiProvider.generateLesson(course.id, lessonId, buildLessonContext(course, lesson))
        lesson = { ...lesson, content }
        demoStorage.saveLesson(course.id, lesson)
      }
      
      demoStorage.setCurrentLessonId(lessonId)
      
      setState(prev => ({ 
        ...prev, 
        currentLesson: lesson,
        view: 'lesson',
        isGenerating: false 
      }))
      navigate(`/lesson/${lessonId}`)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load lesson'
      setState(prev => ({ 
        ...prev, 
        isGenerating: false,
        error: message 
      }))
      throw e
    }
  }, [state.course, navigate])

  const completeLesson = useCallback((lessonId: string) => {
    const { course } = state
    if (!course) return
    
    const updatedLessons = course.lessons.map(l => {
      if (l.id === lessonId) return { ...l, status: 'completed' as const }
      if (l.status === 'locked' && l.order === course.lessons.find(ll => ll.id === lessonId)!.order + 1) {
        return { ...l, status: 'available' as const }
      }
      return l
    })
    
    const updatedCourse = { ...course, lessons: updatedLessons }
    demoStorage.saveCourse(updatedCourse)
    demoStorage.saveLessons(course.id, updatedLessons)
    
    setState(prev => ({ ...prev, course: updatedCourse }))
  }, [state.course])

  const startQuiz = useCallback((quiz: Quiz) => {
    setState(prev => ({ ...prev, currentQuiz: quiz, view: 'quiz' }))
    navigate('/quiz')
  }, [navigate])

  const startQuizForLesson = useCallback(async (lessonId: string) => {
    const { course } = state
    if (!course) throw new Error('No active course')

    const lesson = course.lessons.find(l => l.id === lessonId)
    if (!lesson) throw new Error('Lesson not found')

    setState(prev => ({ ...prev, isGenerating: true, error: null }))
    try {
      let quiz = lesson.quiz

      if (!quiz) {
        const depth = course.input.depth
        const questionCount = depth === 'quick' ? 4 : depth === 'mastery' ? 8 : 6
        quiz = await aiProvider.generateQuiz(lesson, {
          lesson,
          concepts: buildLessonContext(course, lesson).concepts,
          depth,
          questionCount,
        })

        const updatedLesson = { ...lesson, quiz }
        const updatedLessons = course.lessons.map(l => (l.id === lessonId ? updatedLesson : l))
        const updatedCourse = { ...course, lessons: updatedLessons }
        demoStorage.saveLesson(course.id, updatedLesson)
        demoStorage.saveCourse(updatedCourse)

        setState(prev => ({
          ...prev,
          course: updatedCourse,
          currentLesson: updatedLesson,
        }))
      }

      setState(prev => ({ ...prev, currentQuiz: quiz, view: 'quiz', isGenerating: false }))
      navigate('/quiz')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to generate quiz'
      setState(prev => ({ ...prev, isGenerating: false, error: message }))
      throw e
    }
  }, [state.course, navigate])

  const submitQuiz = useCallback(async (answers: Record<string, string | string[]>) => {
    const { currentQuiz, currentLesson, course } = state
    if (!currentQuiz || !currentLesson || !course) return
    
    setState(prev => ({ ...prev, isGenerating: true }))
    try {
      let score = 0
      const conceptScores: Record<string, number> = {}
      
      for (const question of currentQuiz.questions) {
        const userAnswer = answers[question.id]
        let isCorrect = false
        
        if (question.type === 'multiple-choice') {
          isCorrect = normalizeText(userAnswer as string) === normalizeText(question.correctAnswer as string)
        } else if (question.type === 'multiple-select') {
          const userArr = Array.isArray(userAnswer) ? userAnswer : [userAnswer].filter(Boolean)
          const correctArr = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer]
          isCorrect =
            userArr.length === correctArr.length &&
            userArr.every(a => correctArr.some(c => normalizeText(c) === normalizeText(a)))
        } else if (question.type === 'short-answer') {
          isCorrect = gradeShortAnswer(
            typeof userAnswer === 'string' ? userAnswer : '',
            question.correctAnswer
          )
        }
        
        if (isCorrect) score++
        
        for (const conceptId of question.conceptIds) {
          if (!conceptScores[conceptId]) conceptScores[conceptId] = 0
          if (isCorrect) conceptScores[conceptId]++
        }
      }
      
      const finalScore = Math.round((score / currentQuiz.questions.length) * 100)
      const passed = finalScore >= currentQuiz.passingScore
      
      for (const conceptId of Object.keys(conceptScores)) {
        const total = currentQuiz.questions.filter(q => q.conceptIds.includes(conceptId)).length
        conceptScores[conceptId] = Math.round((conceptScores[conceptId] / total) * 100)
      }
      
      const attempt: QuizAttempt = {
        id: `attempt-${Date.now()}`,
        quizId: currentQuiz.id,
        lessonId: currentLesson.id,
        userId: 'demo-user',
        answers,
        score: finalScore,
        passed,
        conceptScores,
        startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        completedAt: new Date().toISOString(),
        timeSpentSeconds: 300
      }
      
      demoStorage.saveQuizAttempt(attempt, course.id)
      
      const masteries = demoStorage.getConceptMasteries(course.id)
      for (const conceptId of currentLesson.concepts) {
        const current = masteries.get(conceptId) || {
          conceptId,
          userId: 'demo-user',
          courseId: course.id,
          accuracy: 0,
          attempts: 0,
          lastAttemptAt: new Date().toISOString(),
          status: 'not-studied' as const
        }
        const updated = adaptiveEngine.updateConceptMastery(current, attempt, conceptId)
        demoStorage.updateConceptMastery(course.id, updated)
      }
      
      const session = {
        id: `session-${Date.now()}`,
        userId: 'demo-user',
        courseId: course.id,
        lessonId: currentLesson.id,
        startedAt: attempt.startedAt,
        endedAt: attempt.completedAt,
        durationMinutes: Math.ceil(attempt.timeSpentSeconds / 60),
        completed: true
      }
      demoStorage.saveStudySession(session)
      
      if (passed) {
        completeLesson(currentLesson.id)
      }
      
      setState(prev => ({ 
        ...prev, 
        quizAttempt: attempt,
        view: 'results',
        isGenerating: false 
      }))
      navigate('/results')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to submit quiz'
      setState(prev => ({ 
        ...prev, 
        isGenerating: false,
        error: message 
      }))
      throw e
    }
  }, [state.currentQuiz, state.currentLesson, state.course, completeLesson, navigate])

  const retryQuiz = useCallback(() => {
    setState(prev => ({ ...prev, quizAttempt: null, view: 'quiz' }))
    navigate('/quiz')
  }, [navigate])

  const getProgressSnapshot = useCallback(() => {
    const { course } = state
    if (!course) return null
    return calculateProgressSnapshot(course)
  }, [state.course])

  const getRecommendations = useCallback(() => {
    const { course } = state
    if (!course) return []
    
    const masteries = demoStorage.getConceptMasteries(course.id)
    const attempts = demoStorage.getQuizAttempts(course.id)
    const completedLessonIds = new Set(course.lessons.filter(l => l.status === 'completed').map(l => l.id))
    
    return adaptiveEngine.getRecommendations(course, masteries, attempts, completedLessonIds)
  }, [state.course])

  const generateLessonContent = useCallback(async (lessonId: string) => {
    const { course } = state
    if (!course) return
    
    setState(prev => ({ ...prev, isGenerating: true }))
    try {
      const lesson = course.lessons.find(l => l.id === lessonId)
      if (!lesson) throw new Error('Lesson not found')
      
      const content = await aiProvider.generateLesson(course.id, lessonId, buildLessonContext(course, lesson))
      const updatedLesson = { ...lesson, content }
      demoStorage.saveLesson(course.id, updatedLesson)
      
      setState(prev => ({ 
        ...prev, 
        currentLesson: updatedLesson,
        isGenerating: false 
      }))
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to generate lesson content'
      setState(prev => ({ 
        ...prev, 
        isGenerating: false,
        error: message 
      }))
      throw e
    }
  }, [state.course])

  const simplifyExplanation = useCallback(async (text: string, concept: string) => {
    return aiProvider.simplifyExplanation(text, concept)
  }, [])

  const generateWorkedExample = useCallback(async (concept: string, context: string) => {
    return aiProvider.generateWorkedExample(concept, context)
  }, [])

  useEffect(() => {
    initializeApp()
  }, [initializeApp])

  return (
    <AppContext.Provider value={{
      ...state,
      setView,
      setError,
      initializeApp,
      authSession,
      isAuthenticated: authSession !== null,
      signIn,
      register,
      continueAsDemo,
      signOut,
      startCourse,
      loadCourse,
      selectLesson,
      completeLesson,
      startQuiz,
      startQuizForLesson,
      submitQuiz,
      retryQuiz,
      getProgressSnapshot,
      getRecommendations,
      generateLessonContent,
      simplifyExplanation,
      generateWorkedExample
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}