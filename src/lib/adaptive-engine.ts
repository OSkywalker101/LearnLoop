import type { 
  ConceptMastery, 
  QuizAttempt, 
  Lesson, 
  Course, 
  AdaptiveRecommendation,
  RevisionRecommendation 
} from '../types'

export interface AdaptiveEngineConfig {
  lowAccuracyThreshold: number
  highAccuracyThreshold: number
  revisionIntervalDays: number
  maxConsecutiveFailures: number
}

const DEFAULT_CONFIG: AdaptiveEngineConfig = {
  lowAccuracyThreshold: 60,
  highAccuracyThreshold: 85,
  revisionIntervalDays: 3,
  maxConsecutiveFailures: 2
}

export class AdaptiveEngine {
  private config: AdaptiveEngineConfig

  constructor(config: Partial<AdaptiveEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  updateConceptMastery(
    currentMastery: ConceptMastery,
    attempt: QuizAttempt,
    conceptId: string
  ): ConceptMastery {
    const conceptScore = attempt.conceptScores[conceptId] ?? attempt.score
    const newAttempts = currentMastery.attempts + 1
    const newAccuracy = Math.round(
      (currentMastery.accuracy * currentMastery.attempts + conceptScore) / newAttempts
    )

    let status: ConceptMastery['status'] = currentMastery.status
    if (newAccuracy >= this.config.highAccuracyThreshold && newAttempts >= 2) {
      status = currentMastery.status === 'mastered' ? 'mastered' : 'proficient'
    } else if (newAccuracy < this.config.lowAccuracyThreshold) {
      status = 'needs-revision'
    } else if (status === 'not-studied') {
      status = 'learning'
    }

    const nextReviewAt = new Date()
    nextReviewAt.setDate(nextReviewAt.getDate() + this.config.revisionIntervalDays)

    return {
      ...currentMastery,
      conceptId,
      accuracy: newAccuracy,
      attempts: newAttempts,
      lastAttemptAt: attempt.completedAt,
      status,
      nextReviewAt: nextReviewAt.toISOString()
    }
  }

  getRecommendations(
    course: Course,
    conceptMasteries: Map<string, ConceptMastery>,
    recentAttempts: QuizAttempt[],
    completedLessonIds: Set<string>
  ): AdaptiveRecommendation[] {
    const recommendations: AdaptiveRecommendation[] = []

    const weakConcepts = this.getWeakConcepts(conceptMasteries)
    const dueForRevision = this.getDueForRevision(conceptMasteries)
    const failedConcepts = this.getRecentlyFailedConcepts(recentAttempts)

    if (weakConcepts.length > 0) {
      const lessonId = this.findLessonForConcepts(course, weakConcepts)
      if (lessonId) {
        recommendations.push({
          type: 'revision',
          lessonId,
          conceptIds: weakConcepts,
          reason: `Low accuracy on ${weakConcepts.length} concept(s). Review recommended.`,
          confidence: 0.9
        })
      }
    }

    if (dueForRevision.length > 0) {
      const lessonId = this.findLessonForConcepts(course, dueForRevision)
      if (lessonId) {
        recommendations.push({
          type: 'revision',
          lessonId,
          conceptIds: dueForRevision,
          reason: `${dueForRevision.length} concept(s) due for spaced repetition review.`,
          confidence: 0.8
        })
      }
    }

    if (failedConcepts.length >= this.config.maxConsecutiveFailures) {
      const prerequisiteLesson = this.findPrerequisiteLesson(course, failedConcepts)
      if (prerequisiteLesson) {
        recommendations.push({
          type: 'prerequisite-review',
          lessonId: prerequisiteLesson,
          conceptIds: failedConcepts,
          reason: `Repeated difficulty with these concepts. Prerequisite review suggested.`,
          confidence: 0.85
        })
      }
    }

    const nextLesson = this.getNextAvailableLesson(course, completedLessonIds)
    if (nextLesson) {
      const isHarder = this.shouldProgressToHarder(conceptMasteries, nextLesson)
      recommendations.push({
        type: isHarder ? 'harder-exercise' : 'next-lesson',
        lessonId: nextLesson.id,
        conceptIds: nextLesson.concepts,
        reason: isHarder 
          ? 'Strong performance - ready for more challenging material'
          : 'Next lesson in your curriculum',
        confidence: isHarder ? 0.75 : 0.95
      })
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence)
  }

  getRevisionRecommendations(
    conceptMasteries: Map<string, ConceptMastery>
  ): RevisionRecommendation[] {
    const recommendations: RevisionRecommendation[] = []
    const now = new Date()

    for (const [conceptId, mastery] of conceptMasteries) {
      if (mastery.status === 'needs-revision') {
        recommendations.push({
          conceptId,
          reason: `Accuracy dropped to ${mastery.accuracy}%`,
          priority: mastery.accuracy < 40 ? 'high' : 'medium'
        })
      } else if (mastery.nextReviewAt && new Date(mastery.nextReviewAt) <= now) {
        recommendations.push({
          conceptId,
          reason: 'Scheduled spaced repetition review',
          priority: 'medium'
        })
      } else if (mastery.status === 'proficient' && mastery.attempts >= 3) {
        const daysSinceLastAttempt = (now.getTime() - new Date(mastery.lastAttemptAt).getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceLastAttempt > this.config.revisionIntervalDays * 2) {
          recommendations.push({
            conceptId,
            reason: 'Maintain mastery with periodic review',
            priority: 'low'
          })
        }
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }

  private getWeakConcepts(masteries: Map<string, ConceptMastery>): string[] {
    return Array.from(masteries.entries())
      .filter(([, m]) => m.status === 'needs-revision' || m.accuracy < this.config.lowAccuracyThreshold)
      .map(([id]) => id)
  }

  private getDueForRevision(masteries: Map<string, ConceptMastery>): string[] {
    const now = new Date()
    return Array.from(masteries.entries())
      .filter(([, m]) => m.nextReviewAt && new Date(m.nextReviewAt) <= now && m.status !== 'mastered')
      .map(([id]) => id)
  }

  private getRecentlyFailedConcepts(attempts: QuizAttempt[]): string[] {
    const recent = attempts.slice(-3)
    const failedConcepts = new Set<string>()
    
    for (const attempt of recent) {
      if (attempt.score < this.config.lowAccuracyThreshold) {
        for (const [conceptId, score] of Object.entries(attempt.conceptScores)) {
          if (score < this.config.lowAccuracyThreshold) {
            failedConcepts.add(conceptId)
          }
        }
      }
    }
    
    return Array.from(failedConcepts)
  }

  private findLessonForConcepts(course: Course, conceptIds: string[]): string | null {
    for (const lesson of course.lessons) {
      if (lesson.concepts.some(c => conceptIds.includes(c))) {
        return lesson.id
      }
    }
    return null
  }

  private findPrerequisiteLesson(course: Course, conceptIds: string[]): string | null {
    for (const conceptId of conceptIds) {
      for (const lesson of course.lessons) {
        if (lesson.concepts.includes(conceptId) && lesson.order > 0) {
          const prevLesson = course.lessons.find(l => l.order === lesson.order - 1)
          if (prevLesson) return prevLesson.id
        }
      }
    }
    return null
  }

  private getNextAvailableLesson(course: Course, completedLessonIds: Set<string>): Lesson | null {
    const available = course.lessons
      .filter(l => l.status === 'available' || (l.status === 'locked' && completedLessonIds.has(l.id)))
      .sort((a, b) => a.order - b.order)
    return available[0] || null
  }

  private shouldProgressToHarder(masteries: Map<string, ConceptMastery>, lesson: Lesson): boolean {
    const relevantMasteries = lesson.concepts
      .map(c => masteries.get(c))
      .filter((m): m is ConceptMastery => m !== undefined)
    
    if (relevantMasteries.length === 0) return false
    
    const avgAccuracy = relevantMasteries.reduce((sum, m) => sum + m.accuracy, 0) / relevantMasteries.length
    return avgAccuracy >= this.config.highAccuracyThreshold
  }
}

export function createAdaptiveEngine(config?: Partial<AdaptiveEngineConfig>): AdaptiveEngine {
  return new AdaptiveEngine(config)
}

export function initializeConceptMastery(course: Course): Map<string, ConceptMastery> {
  const masteries = new Map<string, ConceptMastery>()
  const now = new Date().toISOString()
  
  for (const lesson of course.lessons) {
    for (const conceptId of lesson.concepts) {
      if (!masteries.has(conceptId)) {
        masteries.set(conceptId, {
          conceptId,
          userId: 'demo-user',
          courseId: course.id,
          accuracy: 0,
          attempts: 0,
          lastAttemptAt: now,
          status: 'not-studied'
        })
      }
    }
  }
  
  return masteries
}