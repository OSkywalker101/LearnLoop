import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Progress, CircularProgress } from '../ui/Progress'
import { Badge } from '../ui/Badge'
import { 
  CheckCircle, XCircle, ChevronRight, 
  TrendingUp, BookOpen, PlayCircle, RotateCcw, ArrowRight
} from 'lucide-react'
import { useApp } from '../../context/AppContext'

export const ResultsPage: React.FC = () => {
  const navigate = useNavigate()
  const { 
    course, 
    currentLesson, 
    currentQuiz, 
    quizAttempt, 
    retryQuiz, 
    selectLesson,
    setView,
    getRecommendations
  } = useApp()
  const [recommendations, setRecommendations] = useState<ReturnType<typeof getRecommendations>>([])

  useEffect(() => {
    if (course) setRecommendations(getRecommendations())
  }, [course, getRecommendations])

  if (!quizAttempt || !currentQuiz || !currentLesson || !course) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-neutral-600">No quiz results available</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">Back to Dashboard</Button>
        </div>
      </div>
    )
  }

  const passed = quizAttempt.passed
  const score = quizAttempt.score
  const conceptScores = quizAttempt.conceptScores

  const conceptLabels: Record<string, string> = {}
  const keyTerms = currentLesson.content?.keyTerms ?? []
  currentQuiz.questions.forEach(question => {
    question.conceptIds.forEach(conceptId => {
      if (conceptLabels[conceptId]) return
      const term = keyTerms.find(t => t.term && question.question.toLowerCase().includes(t.term.toLowerCase()))
      conceptLabels[conceptId] = term?.term
        || question.question.replace(/[?:]$/, '').replace(/^which of the following\s*/i, '').trim().slice(0, 40)
        || conceptId.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    })
  })
  const conceptName = (id: string) => conceptLabels[id] || id

  const correctCount = currentQuiz.questions.filter((q, _i) => {
    const userAnswer = quizAttempt.answers[q.id]
    if (q.type === 'multiple-choice') return userAnswer === q.correctAnswer
    if (q.type === 'multiple-select') {
      const userArr = Array.isArray(userAnswer) ? userAnswer : [userAnswer].filter(Boolean)
      const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer]
      return userArr.length === correctArr.length && userArr.every(a => correctArr.includes(a))
    }
    return typeof userAnswer === 'string' && userAnswer.trim().length > 10
  }).length

  const currentIndex = course.lessons.findIndex(l => l.id === currentLesson.id)
  const nextLesson = currentIndex < course.lessons.length - 1 ? course.lessons[currentIndex + 1] : null

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ChevronRight className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <div className="relative inline-block mb-6">
            <CircularProgress 
              value={score} 
              size={120} 
              strokeWidth={8}
              variant={passed ? 'success' : 'warning'}
            />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            {passed ? 'Quiz Passed!' : 'Keep Practicing'}
          </h1>
          <p className="text-lg text-neutral-600">
            You scored <span className="font-semibold text-neutral-900">{score}%</span> 
            ({correctCount} of {currentQuiz.questions.length} correct)
          </p>
          <Badge 
            variant={passed ? 'success' : 'warning'} 
            size="lg" 
            className="mt-4 inline-flex"
            dot
          >
            {passed ? 'Passed' : 'Below Passing'}
          </Badge>
        </div>

        <Card variant="elevated" padding="lg" className="mb-6">
          <CardHeader>
            <CardTitle>Question Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentQuiz.questions.map((question, _i) => {
                const userAnswer = quizAttempt.answers[question.id]
                let isCorrect = false
                
                if (question.type === 'multiple-choice') {
                  isCorrect = userAnswer === question.correctAnswer
                } else if (question.type === 'multiple-select') {
                  const userArr = Array.isArray(userAnswer) ? userAnswer : [userAnswer].filter(Boolean)
                  const correctArr = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer]
                  isCorrect = userArr.length === correctArr.length && userArr.every(a => correctArr.includes(a))
                } else {
                  isCorrect = typeof userAnswer === 'string' && userAnswer.trim().length > 10
                }

                const conceptScore = conceptScores[question.conceptIds[0]] || 0

                return (
                  <div key={question.id} className="p-4 rounded-xl border border-neutral-200">
                    <div className="flex items-start gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
                        {isCorrect ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-neutral-900">{question.question}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm">
                          <Badge variant={isCorrect ? 'success' : 'default'} size="sm">
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </Badge>
                          {conceptScore > 0 && (
                            <Badge variant="info" size="sm">
                              Concept: {Math.round(conceptScore)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ml-11 space-y-1 text-sm">
                      <p className="text-neutral-600">
                        <span className="font-medium">Your answer:</span> 
                        {question.type === 'multiple-select' 
                          ? (Array.isArray(userAnswer) ? userAnswer.join(', ') : userAnswer || 'No answer')
                          : userAnswer || 'No answer'}
                      </p>
                      {!isCorrect && (
                        <p className="text-neutral-600">
                          <span className="font-medium">Correct answer:</span> 
                          {Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : question.correctAnswer}
                        </p>
                      )}
                      <p className="text-neutral-500">{question.explanation}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" padding="lg" className="mb-6">
          <CardHeader>
            <CardTitle>Concept Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(conceptScores).map(([conceptId, conceptScore]) => (
                <div key={conceptId} className="flex items-center gap-4">
                  <div className="w-40 text-sm text-neutral-600 font-medium truncate" title={conceptName(conceptId)}>{conceptName(conceptId)}</div>
                  <div className="flex-1">
                    <Progress 
                      value={conceptScore} 
                      max={100} 
                      size="sm" 
                      variant={conceptScore >= 80 ? 'success' : conceptScore >= 60 ? 'warning' : 'default'}
                    />
                  </div>
                  <span className={`text-sm font-medium ${conceptScore >= 80 ? 'text-green-600' : conceptScore >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                    {conceptScore}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {recommendations.length > 0 && (
          <Card variant="outlined" padding="lg" className="mb-6 border-primary-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-600" />
                Recommended Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendations.slice(0, 3).map((rec, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={() => rec.lessonId && selectLesson(rec.lessonId)}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
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
                    <div className="text-left">
                      <p className="font-medium text-neutral-900">{rec.reason}</p>
                      <p className="text-xs text-neutral-500">{rec.type.replace('-', ' ')} · {Math.round(rec.confidence * 100)}% confidence</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400 ml-auto" />
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {passed && nextLesson && (
            <Button 
              size="lg" 
              onClick={() => selectLesson(nextLesson.id)}
              className="w-full sm:w-auto"
            >
              <PlayCircle className="w-5 h-5 mr-2" />
              Continue to Next Lesson
            </Button>
          )}
          {!passed && (
            <Button 
              size="lg" 
              variant="outline"
              onClick={retryQuiz}
              className="w-full sm:w-auto"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Retry Quiz
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="lg"
            onClick={() => setView('dashboard')}
            className="w-full sm:w-auto"
          >
            <BookOpen className="w-5 h-5 mr-2" />
            View Dashboard
          </Button>
        </div>
      </main>
    </div>
  )
}