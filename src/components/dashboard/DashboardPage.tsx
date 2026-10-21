import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Progress, CircularProgress } from '../ui/Progress'
import { Badge } from '../ui/Badge'
import { ArrowRight, PlayCircle, Clock, Target, TrendingUp, BookOpen, RotateCcw, ChevronRight, CheckCircle } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatDuration, calculateProgress } from '../../utils/helpers'
import type { } from '../../types'

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { course, selectLesson, getProgressSnapshot, getRecommendations, setView } = useApp()
  const [recommendations, setRecommendations] = useState<ReturnType<typeof getRecommendations>>([])
  const [progress, setProgress] = useState<ReturnType<typeof getProgressSnapshot> | null>(null)

  useEffect(() => {
    if (course) {
      setProgress(getProgressSnapshot())
      setRecommendations(getRecommendations())
    }
  }, [course, getProgressSnapshot, getRecommendations])

  if (!course) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">No active course</h2>
          <p className="text-neutral-600 mb-6">Create a course to get started</p>
          <Button onClick={() => navigate('/wizard')}>
            <PlayCircle className="w-5 h-5 mr-2" />
            Create Course
          </Button>
        </div>
      </div>
    )
  }

  const nextLesson = course.lessons.find(l => l.status === 'available' || l.status === 'in-progress')
  const completedCount = course.lessons.filter(l => l.status === 'completed').length
  const totalLessons = course.lessons.length
  const overallProgress = calculateProgress(completedCount, totalLessons)

  const currentModule = course.modules.find(m => m.id === nextLesson?.moduleId)

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8 text-primary-600" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <rect width="32" height="32" rx="8" fill="currentColor"/>
                <path d="M16 6C10.477 6 6 10.477 6 16C6 21.523 10.477 26 16 26C21.523 26 26 21.523 26 16C26 10.477 21.523 6 16 6ZM16 4C22.627 4 28 9.373 28 16C28 22.627 22.627 28 16 28C9.373 28 4 22.627 4 16C4 9.373 9.373 4 16 4Z" fill="white"/>
                <path d="M11 12H21M11 16H19M11 20H17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="24" cy="8" r="3" fill="#22c55e"/>
              </svg>
              <span className="text-xl font-bold text-neutral-900">LearnLoop</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setView('progress')}>
                <TrendingUp className="w-4 h-4 mr-2" />
                Progress
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">{course.title}</h1>
              <p className="text-neutral-600 mt-1">{course.description}</p>
            </div>
            <div className="flex items-center gap-4 text-sm text-neutral-500">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {formatDuration(course.totalEstimatedMinutes)}
              </span>
              <span className="flex items-center gap-1.5">
                <Target className="w-4 h-4" />
                {course.input.depth}
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="elevated" padding="md">
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">Overall Progress</p>
                  <p className="text-2xl font-bold text-neutral-900">{overallProgress}%</p>
                </div>
                <CircularProgress value={overallProgress} size={60} showValue={false} />
              </CardContent>
            </Card>
            <Card variant="elevated" padding="md">
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">Lessons Completed</p>
                  <p className="text-2xl font-bold text-neutral-900">{completedCount} / {totalLessons}</p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card variant="elevated" padding="md">
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">Study Time</p>
                  <p className="text-2xl font-bold text-neutral-900">{progress?.totalStudyMinutes || 0} min</p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card variant="elevated" padding="md">
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">Avg Quiz Score</p>
                  <p className="text-2xl font-bold text-neutral-900">{progress?.averageQuizScore || 0}%</p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {nextLesson && (
          <div className="mb-8">
            <Card variant="elevated" padding="lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge variant="primary" size="sm">{currentModule?.title || 'Current Module'}</Badge>
                    <Badge variant={nextLesson.status === 'in-progress' ? 'info' : 'default'} size="sm">
                      {nextLesson.status === 'in-progress' ? 'In Progress' : 'Next Up'}
                    </Badge>
                  </div>
                  <h2 className="text-xl font-semibold text-neutral-900 mb-2">{nextLesson.title}</h2>
                  <p className="text-neutral-600 mb-4">{nextLesson.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {formatDuration(nextLesson.estimatedMinutes)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Target className="w-4 h-4" />
                      {nextLesson.concepts.length} concepts
                    </span>
                  </div>
                </div>
                <Button 
                  size="lg" 
                  onClick={() => { selectLesson(nextLesson.id).catch(() => {}) }}
                  className="w-full sm:w-auto"
                >
                  <PlayCircle className="w-5 h-5 mr-2" />
                  {nextLesson.status === 'in-progress' ? 'Continue Learning' : 'Start Lesson'}
                </Button>
              </div>
            </Card>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card variant="outlined" padding="lg">
              <CardHeader>
                <CardTitle>Curriculum</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {course.modules.map((module, moduleIndex) => {
                    const moduleLessonList = course.lessons.filter(l => l.moduleId === module.id)
                    const moduleCompletedCount = moduleLessonList.filter(l => l.status === 'completed').length
                    const moduleProgress = calculateProgress(moduleCompletedCount, moduleLessonList.length)
                    const isCurrentModule = currentModule?.id === module.id

                    return (
                      <div key={module.id} className={`rounded-xl p-4 transition-colors ${isCurrentModule ? 'bg-primary-50 border border-primary-100' : 'bg-neutral-50'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                              moduleCompletedCount === moduleLessonList.length 
                                ? 'bg-green-100 text-green-600' 
                                : isCurrentModule 
                                  ? 'bg-primary-100 text-primary-600' 
                                  : 'bg-neutral-200 text-neutral-500'
                            }`}>
                              {moduleCompletedCount === moduleLessonList.length ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : (
                                moduleIndex + 1
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold text-neutral-900">{module.title}</h3>
                              <p className="text-sm text-neutral-500">{module.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-neutral-900">{moduleProgress}%</p>
                            <p className="text-xs text-neutral-500">{moduleCompletedCount} / {moduleLessonList.length} lessons</p>
                          </div>
                        </div>
                        <Progress value={moduleProgress} max={100} size="sm" className="mb-4" />
                        <div className="space-y-2">
                          {moduleLessonList.map(lesson => (
                            <button
                              key={lesson.id}
                              onClick={() => { selectLesson(lesson.id).catch(() => {}) }}
                              disabled={lesson.status === 'locked'}
                              className={`w-full text-left p-3 rounded-xl flex items-center justify-between gap-4 transition-colors ${
                                lesson.status === 'completed' 
                                  ? 'bg-green-50 border border-green-100' 
                                  : lesson.status === 'in-progress' 
                                    ? 'bg-primary-50 border border-primary-100' 
                                    : lesson.status === 'available' 
                                      ? 'hover:bg-white border border-neutral-200' 
                                      : 'bg-neutral-50 border border-neutral-200 opacity-60 cursor-not-allowed'
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  lesson.status === 'completed' 
                                    ? 'bg-green-100 text-green-600' 
                                    : lesson.status === 'in-progress' 
                                      ? 'bg-primary-100 text-primary-600 animate-pulse' 
                                      : lesson.status === 'available' 
                                        ? 'bg-neutral-200 text-neutral-500' 
                                        : 'bg-neutral-100 text-neutral-300'
                                }`}>
                                  {lesson.status === 'completed' ? (
                                    <CheckCircle className="w-5 h-5" />
                                  ) : lesson.status === 'in-progress' ? (
                                    <PlayCircle className="w-5 h-5" />
                                  ) : (
                                    <span className="text-sm font-medium">{lesson.order + 1}</span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-neutral-900 truncate">{lesson.title}</p>
                                  <p className="text-sm text-neutral-500">{formatDuration(lesson.estimatedMinutes)} · {lesson.concepts.length} concepts</p>
                                </div>
                              </div>
                              {lesson.status !== 'locked' && (
                                <ChevronRight className="w-5 h-5 text-neutral-400 flex-shrink-0" aria-hidden="true" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card variant="outlined" padding="lg">
              <CardHeader>
                <CardTitle>Adaptive Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                {recommendations.length === 0 ? (
                  <div className="text-center py-8">
                    <RotateCcw className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                    <p className="text-neutral-500">Complete a lesson to see personalized recommendations</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recommendations.map((rec, i) => (
                      <div key={i} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            rec.type === 'next-lesson' ? 'bg-blue-100 text-blue-600' :
                            rec.type === 'revision' ? 'bg-amber-100 text-amber-600' :
                            rec.type === 'prerequisite-review' ? 'bg-red-100 text-red-600' :
                            'bg-purple-100 text-purple-600'
                          }`}>
                            {rec.type === 'next-lesson' && <PlayCircle className="w-5 h-5" />}
                            {rec.type === 'revision' && <RotateCcw className="w-5 h-5" />}
                            {rec.type === 'prerequisite-review' && <ArrowRight className="w-5 h-5" />}
                            {rec.type === 'harder-exercise' && <TrendingUp className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge 
                                variant={rec.type === 'next-lesson' ? 'info' : rec.type === 'revision' ? 'warning' : rec.type === 'prerequisite-review' ? 'danger' : 'primary'} 
                                size="sm"
                              >
                                {rec.type.replace('-', ' ')}
                              </Badge>
                              <span className="text-xs text-neutral-500">{Math.round(rec.confidence * 100)}% confidence</span>
                            </div>
                            <p className="text-sm text-neutral-700">{rec.reason}</p>
                            {rec.lessonId && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="mt-2"
                                onClick={() => { selectLesson(rec.lessonId!).catch(() => {}) }}
                              >
                                Go to lesson <ArrowRight className="w-3 h-3 ml-1" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {progress && (
              <Card variant="outlined" padding="lg" className="mt-6">
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-neutral-600">Strong Concepts</span>
                        <span className="font-medium text-green-600">{progress.strongConcepts.length}</span>
                      </div>
                      <Progress value={progress.strongConcepts.length} max={Math.max(1, progress.strongConcepts.length + progress.weakConcepts.length)} size="sm" variant="success" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-neutral-600">Needs Revision</span>
                        <span className="font-medium text-amber-600">{progress.weakConcepts.length}</span>
                      </div>
                      <Progress value={progress.weakConcepts.length} max={Math.max(1, progress.strongConcepts.length + progress.weakConcepts.length)} size="sm" variant="warning" />
                    </div>
                    <div className="pt-4 border-t border-neutral-100">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-neutral-600">Current Streak</span>
                        <span className="font-medium text-neutral-900">{progress.currentStreak} days</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-600">Longest Streak</span>
                        <span className="font-medium text-neutral-900">{progress.longestStreak} days</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}