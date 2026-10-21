import type { 
  UserProfile, 
  Course, 
  Lesson, 
  QuizAttempt, 
  ConceptMastery, 
  StudySession,
  ProgressSnapshot 
} from '../types'
import { generateId } from '../utils/helpers'

const STORAGE_KEYS = {
  user: 'learnloop_user',
  courses: 'learnloop_courses',
  lessons: 'learnloop_lessons',
  quizAttempts: 'learnloop_quiz_attempts',
  conceptMasteries: 'learnloop_concept_masteries',
  studySessions: 'learnloop_study_sessions',
  currentCourse: 'learnloop_current_course',
  currentLesson: 'learnloop_current_lesson',
} as const

function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key)
    return item ? (JSON.parse(item) as T) : defaultValue
  } catch {
    return defaultValue
  }
}

function setToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('Storage error:', e)
  }
}

export const demoStorage = {
  getUser(): UserProfile | null {
    return getFromStorage(STORAGE_KEYS.user, null)
  },

  setUser(user: UserProfile): void {
    setToStorage(STORAGE_KEYS.user, user)
  },

  clearUser(): void {
    localStorage.removeItem(STORAGE_KEYS.user)
  },

  getCourses(): Course[] {
    return getFromStorage(STORAGE_KEYS.courses, [])
  },

  getCourse(courseId: string): Course | null {
    const courses = this.getCourses()
    return courses.find(c => c.id === courseId) || null
  },

  saveCourse(course: Course): void {
    const courses = this.getCourses()
    const idx = courses.findIndex(c => c.id === course.id)
    if (idx >= 0) courses[idx] = course
    else courses.push(course)
    setToStorage(STORAGE_KEYS.courses, courses)
  },

  deleteCourse(courseId: string): void {
    const courses = this.getCourses().filter(c => c.id !== courseId)
    setToStorage(STORAGE_KEYS.courses, courses)
  },

  getLessons(courseId: string): Lesson[] {
    const key = `${STORAGE_KEYS.lessons}_${courseId}`
    return getFromStorage(key, [])
  },

  saveLessons(courseId: string, lessons: Lesson[]): void {
    const key = `${STORAGE_KEYS.lessons}_${courseId}`
    setToStorage(key, lessons)
  },

  getLesson(courseId: string, lessonId: string): Lesson | null {
    const lessons = this.getLessons(courseId)
    return lessons.find(l => l.id === lessonId) || null
  },

  saveLesson(courseId: string, lesson: Lesson): void {
    const lessons = this.getLessons(courseId)
    const idx = lessons.findIndex(l => l.id === lesson.id)
    if (idx >= 0) lessons[idx] = lesson
    else lessons.push(lesson)
    this.saveLessons(courseId, lessons)
  },

  getQuizAttempts(courseId: string): QuizAttempt[] {
    const key = `${STORAGE_KEYS.quizAttempts}_${courseId}`
    return getFromStorage<QuizAttempt[]>(key, [])
  },

  saveQuizAttempt(attempt: QuizAttempt, courseId: string): void {
    const key = `${STORAGE_KEYS.quizAttempts}_${courseId}`
    const attempts = getFromStorage<QuizAttempt[]>(key, [])
    attempts.push(attempt)
    setToStorage(key, attempts)
  },

  getConceptMasteries(courseId: string): Map<string, ConceptMastery> {
    const key = `${STORAGE_KEYS.conceptMasteries}_${courseId}`
    const obj = getFromStorage<Record<string, ConceptMastery>>(key, {})
    return new Map(Object.entries(obj))
  },

  saveConceptMasteries(courseId: string, masteries: Map<string, ConceptMastery>): void {
    const key = `${STORAGE_KEYS.conceptMasteries}_${courseId}`
    setToStorage(key, Object.fromEntries(masteries))
  },

  updateConceptMastery(courseId: string, mastery: ConceptMastery): void {
    const masteries = this.getConceptMasteries(courseId)
    masteries.set(mastery.conceptId, mastery)
    this.saveConceptMasteries(courseId, masteries)
  },

  getStudySessions(courseId: string): StudySession[] {
    const key = `${STORAGE_KEYS.studySessions}_${courseId}`
    return getFromStorage<StudySession[]>(key, [])
  },

  saveStudySession(session: StudySession): void {
    const key = `${STORAGE_KEYS.studySessions}_${session.courseId}`
    const sessions = getFromStorage<StudySession[]>(key, [])
    sessions.push(session)
    setToStorage(key, sessions)
  },

  getCurrentCourseId(): string | null {
    return getFromStorage(STORAGE_KEYS.currentCourse, null)
  },

  setCurrentCourseId(courseId: string | null): void {
    if (courseId) setToStorage(STORAGE_KEYS.currentCourse, courseId)
    else localStorage.removeItem(STORAGE_KEYS.currentCourse)
  },

  getCurrentLessonId(): string | null {
    return getFromStorage(STORAGE_KEYS.currentLesson, null)
  },

  setCurrentLessonId(lessonId: string | null): void {
    if (lessonId) setToStorage(STORAGE_KEYS.currentLesson, lessonId)
    else localStorage.removeItem(STORAGE_KEYS.currentLesson)
  },

  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key))
  },

  exportData(): string {
    const data = {
      user: this.getUser(),
      courses: this.getCourses(),
      quizAttempts: {} as Record<string, QuizAttempt[]>,
      conceptMasteries: {} as Record<string, ConceptMastery[]>,
      studySessions: {} as Record<string, StudySession[]>,
    }
    
    for (const course of data.courses) {
      data.quizAttempts[course.id] = this.getQuizAttempts(course.id)
      data.conceptMasteries[course.id] = Array.from(this.getConceptMasteries(course.id).values())
      data.studySessions[course.id] = this.getStudySessions(course.id)
    }
    
    return JSON.stringify(data, null, 2)
  },

  importData(json: string): boolean {
    try {
      const data = JSON.parse(json)
      if (data.user) this.setUser(data.user)
      if (data.courses) setToStorage(STORAGE_KEYS.courses, data.courses)
      if (data.quizAttempts) {
        for (const [courseId, attempts] of Object.entries(data.quizAttempts as Record<string, QuizAttempt[]>)) {
          setToStorage(`${STORAGE_KEYS.quizAttempts}_${courseId}`, attempts)
        }
      }
      if (data.conceptMasteries) {
        for (const [courseId, masteries] of Object.entries(data.conceptMasteries as Record<string, [string, ConceptMastery][]>)) {
          setToStorage(`${STORAGE_KEYS.conceptMasteries}_${courseId}`, Object.fromEntries(masteries))
        }
      }
      if (data.studySessions) {
        for (const [courseId, sessions] of Object.entries(data.studySessions as Record<string, StudySession[]>)) {
          setToStorage(`${STORAGE_KEYS.studySessions}_${courseId}`, sessions)
        }
      }
      return true
    } catch {
      return false
    }
  }
}

export function createAnonymousUser(): UserProfile {
  const user: UserProfile = {
    id: `anon-${generateId()}`,
    isAnonymous: true,
    createdAt: new Date().toISOString(),
    preferences: {
      defaultTimePerDay: 30,
      defaultDepth: 'thorough',
      preferredFormats: ['text', 'diagrams', 'practice']
    }
  }
  demoStorage.setUser(user)
  return user
}

export function getOrCreateUser(): UserProfile {
  let user = demoStorage.getUser()
  if (!user) {
    user = createAnonymousUser()
  }
  return user
}

export function calculateProgressSnapshot(course: Course): ProgressSnapshot {
  const completedLessons = course.lessons.filter(l => l.status === 'completed').length
  const attempts = demoStorage.getQuizAttempts(course.id)
  const masteries = demoStorage.getConceptMasteries(course.id)
  const sessions = demoStorage.getStudySessions(course.id)
  
  const totalStudyMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0)
  const avgScore = attempts.length > 0 
    ? attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length 
    : 0
  
  const strongConcepts = Array.from(masteries.entries())
    .filter(([, m]) => m.status === 'proficient' || m.status === 'mastered')
    .map(([id]) => id)
  
  const weakConcepts = Array.from(masteries.entries())
    .filter(([, m]) => m.status === 'needs-revision')
    .map(([id]) => id)

  const sortedSessions = sessions.filter(s => s.completed).sort((a, b) => 
    new Date(b.endedAt || b.startedAt).getTime() - new Date(a.endedAt || a.startedAt).getTime()
  )
  
  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0
  let lastDate: Date | null = null
  
  for (const session of sortedSessions) {
    const sessionDate = new Date(session.endedAt || session.startedAt)
    sessionDate.setHours(0, 0, 0, 0)
    
    if (!lastDate) {
      tempStreak = 1
    } else {
      const diffDays = (lastDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
      if (diffDays === 1) {
        tempStreak++
      } else if (diffDays > 1) {
        longestStreak = Math.max(longestStreak, tempStreak)
        tempStreak = 1
      }
    }
    lastDate = sessionDate
  }
  longestStreak = Math.max(longestStreak, tempStreak)
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (lastDate && (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24) <= 1) {
    currentStreak = tempStreak
  }

  return {
    courseId: course.id,
    userId: 'demo-user',
    lessonsCompleted: completedLessons,
    totalLessons: course.lessons.length,
    totalStudyMinutes,
    averageQuizScore: Math.round(avgScore),
    strongConcepts,
    weakConcepts,
    currentStreak,
    longestStreak,
    lastStudyDate: sortedSessions[0]?.endedAt,
  }
}