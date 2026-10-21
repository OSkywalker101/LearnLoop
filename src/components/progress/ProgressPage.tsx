import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { CircularProgress } from '../ui/Progress'
import { Badge } from '../ui/Badge'
import { 
  TrendingUp, Target, Clock, BookOpen, 
  CheckCircle, ArrowLeft, Trophy,
  Flame, Award, BarChart2, RotateCcw, PlayCircle
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { calculateProgressSnapshot, demoStorage } from '../../lib/storage'
import { formatDuration, formatRelativeTime } from '../../utils/helpers'
import type { Course, ConceptMastery } from '../../types'

export const ProgressPage: React.FC = () => {
  const navigate = useNavigate()
  const { course, setView, loadCourse } = useApp()
  const [progress, setProgress] = React.useState<ReturnType<typeof calculateProgressSnapshot> | null>(null)
  const [masteries, setMasteries] = React.useState<Map<string, ConceptMastery> | null>(null)
  const [courses, setCourses] = React.useState<Course[]>([])

  React.useEffect(() => {
    if (course) {
      setProgress(calculateProgressSnapshot(course))
      setMasteries(demoStorage.getConceptMasteries(course.id))
    }
    setCourses(demoStorage.getCourses())
  }, [course])

  if (!course && courses.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-6">
            <BarChart2 className="w-8 h-8 text-neutral-400" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">No learning data yet</h2>
          <p className="text-neutral-600 mb-6">Complete lessons and quizzes to see your progress</p>
          <Button onClick={() => navigate('/wizard')}>
            <Target className="w-5 h-5 mr-2" />
            Start Learning
          </Button>
        </div>
      </div>
    )
  }

  const currentCourse = course || courses[0]
  const currentProgress = progress || (currentCourse ? calculateProgressSnapshot(currentCourse) : null)
  const currentMasteries = masteries || (currentCourse ? demoStorage.getConceptMasteries(currentCourse.id) : new Map())

  const strongConcepts = Array.from(currentMasteries.entries())
    .filter(([, m]) => m.status === 'proficient' || m.status === 'mastered')
    .sort((a, b) => b[1].accuracy - a[1].accuracy)

  const weakConcepts = Array.from(currentMasteries.entries())
    .filter(([, m]) => m.status === 'needs-revision' || m.status === 'learning')
    .sort((a, b) => a[1].accuracy - b[1].accuracy)

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-neutral-900">Progress</h1>
                <p className="text-sm text-neutral-500">Track your learning journey</p>
              </div>
            </div>
            {courses.length > 1 && (
              <select
                value={currentCourse?.id || ''}
                onChange={e => loadCourse(e.target.value)}
                className="px-3 py-2 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentCourse && currentProgress && (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card variant="elevated" padding="lg">
                <CardContent className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-500">Completion</p>
                    <p className="text-2xl font-bold text-neutral-900">
                      {currentProgress.lessonsCompleted} / {currentProgress.totalLessons}
                    </p>
                  </div>
                  <CircularProgress 
                    value={(currentProgress.lessonsCompleted / currentProgress.totalLessons) * 100} 
                    size={60} 
                    showValue={false}
                    variant="success"
                  />
                </CardContent>
              </Card>
              <Card variant="elevated" padding="lg">
                <CardContent className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-500">Study Time</p>
                    <p className="text-2xl font-bold text-neutral-900">{formatDuration(currentProgress.totalStudyMinutes)}</p>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
                    <Clock className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card variant="elevated" padding="lg">
                <CardContent className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-500">Avg Quiz Score</p>
                    <p className="text-2xl font-bold text-neutral-900">{currentProgress.averageQuizScore}%</p>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center">
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
              <Card variant="elevated" padding="lg">
                <CardContent className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-500">Current Streak</p>
                    <p className="text-2xl font-bold text-neutral-900">{currentProgress.currentStreak} days</p>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
                    <Flame className="w-8 h-8 text-amber-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Card variant="outlined" padding="lg">
                  <CardHeader>
                    <CardTitle>Concept Mastery</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { label: 'Mastered', concepts: strongConcepts.filter(([, m]) => m.status === 'mastered'), color: 'success' as const },
                        { label: 'Proficient', concepts: strongConcepts.filter(([, m]) => m.status === 'proficient'), color: 'info' as const },
                        { label: 'Learning', concepts: weakConcepts.filter(([, m]) => m.status === 'learning'), color: 'warning' as const },
                        { label: 'Needs Revision', concepts: weakConcepts.filter(([, m]) => m.status === 'needs-revision'), color: 'danger' as const },
                        { label: 'Not Studied', concepts: Array.from(currentMasteries.entries()).filter(([, m]) => m.status === 'not-studied'), color: 'default' as const }
                      ].map(category => {
                        const variants = { success: 'success', info: 'info', warning: 'warning', danger: 'danger', default: 'default' } as const
                        return category.concepts.length > 0 && (
                          <div key={category.label} className="p-4 rounded-xl bg-neutral-50">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge variant={variants[category.color as keyof typeof variants]} size="sm" dot>
                                  {category.label}
                                </Badge>
                                <span className="text-sm text-neutral-500">{category.concepts.length} concepts</span>
                              </div>
                              <span className="text-sm font-medium text-neutral-900">
                                {Math.round(category.concepts.reduce((sum, [, m]) => sum + m.accuracy, 0) / category.concepts.length)}% avg
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {category.concepts.slice(0, 8).map(([id, _m]) => (
                                <Badge 
                                  key={id} 
                                  variant={variants[category.color as keyof typeof variants]} 
                                  size="sm"
                                  className="cursor-default"
                                >
                                  {id.replace('concept-', 'Concept ')}
                                </Badge>
                              ))}
                              {category.concepts.length > 8 && (
                                <Badge variant="default" size="sm">+{category.concepts.length - 8} more</Badge>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card variant="outlined" padding="lg">
                  <CardHeader>
                    <CardTitle>Study Sessions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {demoStorage.getStudySessions(currentCourse.id)
                        .slice(-10)
                        .reverse()
                        .map(session => (
                          <div key={session.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-primary-600" />
                              </div>
                              <div>
                                <p className="font-medium text-neutral-900">Lesson {session.lessonId.replace('lesson-', '')}</p>
                                <p className="text-sm text-neutral-500">{formatRelativeTime(session.startedAt)} · {session.durationMinutes} min</p>
                              </div>
                            </div>
                            <Badge variant={session.completed ? 'success' : 'default'} size="sm">
                              {session.completed ? 'Completed' : 'Incomplete'}
                            </Badge>
                          </div>
                        ))}
                      {demoStorage.getStudySessions(currentCourse.id).length === 0 && (
                        <p className="text-center text-neutral-500 py-8">No study sessions recorded yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card variant="outlined" padding="lg">
                  <CardHeader>
                    <CardTitle>Achievements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { 
                          icon: Trophy, 
                          label: 'First Lesson', 
                          earned: currentProgress.lessonsCompleted > 0,
                          desc: 'Complete your first lesson'
                        },
                        { 
                          icon: Flame, 
                          label: '3-Day Streak', 
                          earned: currentProgress.currentStreak >= 3,
                          desc: 'Study 3 days in a row'
                        },
                        { 
                          icon: Award, 
                          label: 'Quiz Master', 
                          earned: currentProgress.averageQuizScore >= 90,
                          desc: 'Maintain 90%+ average score'
                        },
                        { 
                          icon: Target, 
                          label: 'Course Complete', 
                          earned: currentProgress.lessonsCompleted === currentProgress.totalLessons,
                          desc: 'Finish all lessons in a course'
                        }
                      ].map((achievement, i) => (
                        <div key={i} className={`flex items-center gap-4 p-3 rounded-xl ${achievement.earned ? 'bg-green-50 border border-green-100' : 'bg-neutral-50 border border-neutral-200 opacity-60'}`}>
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${achievement.earned ? 'bg-green-100 text-green-600' : 'bg-neutral-200 text-neutral-400'}`}>
                            <achievement.icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium ${achievement.earned ? 'text-neutral-900' : 'text-neutral-500'}`}>{achievement.label}</p>
                            <p className="text-sm text-neutral-500">{achievement.desc}</p>
                          </div>
                          {achievement.earned && <CheckCircle className="w-5 h-5 text-green-500" />}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card variant="outlined" padding="lg">
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {currentProgress.weakConcepts.length > 0 && (
                        <Button 
                          variant="outline" 
                          className="w-full justify-start"
                          onClick={() => setView('dashboard')}
                        >
                          <RotateCcw className="w-5 h-5 mr-2" />
                          <div className="text-left">
                            <p className="font-medium">Review Weak Concepts</p>
                            <p className="text-xs text-neutral-500">{currentProgress.weakConcepts.length} concepts need attention</p>
                          </div>
                        </Button>
                      )}
                      {currentProgress.lessonsCompleted < currentProgress.totalLessons && (
                        <Button 
                          variant="primary" 
                          className="w-full justify-start"
                          onClick={() => setView('dashboard')}
                        >
                          <PlayCircle className="w-5 h-5 mr-2" />
                          <div className="text-left">
                            <p className="font-medium">Continue Learning</p>
                            <p className="text-xs text-neutral-500">{currentProgress.totalLessons - currentProgress.lessonsCompleted} lessons remaining</p>
                          </div>
                        </Button>
                      )}
                      {currentProgress.lessonsCompleted === currentProgress.totalLessons && (
                        <Button 
                          variant="secondary" 
                          className="w-full justify-start"
                          onClick={() => navigate('/wizard')}
                        >
                          <Trophy className="w-5 h-5 mr-2" />
                          <div className="text-left">
                            <p className="font-medium">Start New Course</p>
                            <p className="text-xs text-neutral-500">You completed this one!</p>
                          </div>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}