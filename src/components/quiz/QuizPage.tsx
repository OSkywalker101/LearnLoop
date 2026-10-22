import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Card, CardContent } from '../ui/Card'
import { Progress } from '../ui/Progress'
import { Badge } from '../ui/Badge'
import { 
  CheckCircle, XCircle, Clock, 
  ChevronLeft, ChevronRight, HelpCircle
} from 'lucide-react'
import { useApp } from '../../context/AppContext'

interface AnswerState {
  [questionId: string]: string | string[]
}

export const QuizPage: React.FC = () => {
  const navigate = useNavigate()
  const { course, currentLesson, currentQuiz, submitQuiz, quizAttempt } = useApp()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerState>({})
  const [showFeedback, setShowFeedback] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const question = currentQuiz?.questions[currentQuestionIndex]
  const totalQuestions = currentQuiz?.questions.length || 0
  const answeredCount = Object.keys(answers).length
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0

  useEffect(() => {
    if (currentQuiz?.timeLimitMinutes) {
      const totalSeconds = currentQuiz.timeLimitMinutes * 60
      setTimeRemaining(totalSeconds)
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval)
            if (prev !== null && prev <= 1) handleTimeUp()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [currentQuiz])

  const handleTimeUp = () => {
    handleSubmit()
  }

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
    if (showFeedback) setShowFeedback(false)
  }

  const handleOptionSelect = (questionId: string, option: string) => {
    const question = currentQuiz?.questions.find(q => q.id === questionId)
    if (!question) return

    if (question.type === 'multiple-select') {
      const current = (answers[questionId] as string[]) || []
      const updated = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option]
      handleAnswerChange(questionId, updated)
    } else {
      handleAnswerChange(questionId, option)
    }
  }

  const handleShortAnswerChange = (questionId: string, value: string) => {
    handleAnswerChange(questionId, value)
  }

  const canGoNext = question ? !!answers[question.id] : false
  const canSubmit = answeredCount === totalQuestions && totalQuestions > 0

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setShowFeedback(false)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
      setShowFeedback(false)
    }
  }

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return
    setSubmitted(true)
    await submitQuiz(answers)
    setSubmitted(false)
  }, [canSubmit, submitQuiz, answers])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!currentQuiz || !currentLesson || !course) {
    return (
      <div className="min-h-screen bg-neutral-50 flex px-6">
        <div className="text-center p-8 m-auto">
          <p className="text-neutral-600">No quiz available</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">Back to Dashboard</Button>
        </div>
      </div>
    )
  }

  if (quizAttempt) {
    return null // Results page will handle this
  }

  const isLastQuestion = currentQuestionIndex === totalQuestions - 1

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 sm:gap-4 h-16">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="shrink-0">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <Progress value={progress} size="sm" showLabel />
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-sm text-neutral-500 shrink-0">
              {timeRemaining !== null && (
                <span className={`flex items-center gap-1.5 ${timeRemaining < 60 ? 'text-red-600' : ''}`}>
                  <Clock className="w-4 h-4" />
                  {formatTime(timeRemaining)}
                </span>
              )}
              <span className="whitespace-nowrap">Question {currentQuestionIndex + 1} / {totalQuestions}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Badge variant="primary" size="sm" className="mb-2">{currentLesson.title}</Badge>
          <h1 className="text-2xl font-bold text-neutral-900">Quiz: {currentQuiz.questions.length} Questions</h1>
          <p className="text-neutral-600 mt-1">Passing score: {currentQuiz.passingScore}%</p>
        </div>

        <Card variant="elevated" padding="lg">
          <CardContent>
            {question && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge 
                      variant={question.type === 'multiple-choice' ? 'info' : question.type === 'multiple-select' ? 'warning' : 'default'} 
                      size="sm"
                    >
                      {question.type.replace('-', ' ')}
                    </Badge>
                    {question.difficulty > 2 && <Badge variant="danger" size="sm">Hard</Badge>}
                    {question.difficulty === 2 && <Badge variant="warning" size="sm">Medium</Badge>}
                    {question.difficulty === 1 && <Badge variant="success" size="sm">Easy</Badge>}
                  </div>
                  <h2 className="text-lg font-semibold text-neutral-900">{question.question}</h2>
                </div>

                {question.type === 'multiple-choice' && (
                  <div className="space-y-3" role="radiogroup" aria-label={question.question}>
                    {question.options?.map((option, i) => (
                      <label
                        key={i}
                        className={`relative flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          answers[question.id] === option
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={answers[question.id] === option}
                          onChange={() => handleOptionSelect(question.id, option)}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 ${
                          answers[question.id] === option ? 'border-primary-500 bg-primary-500' : 'border-neutral-300'
                        }`}>
                          {answers[question.id] === option && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-neutral-700 min-w-0 break-words">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === 'multiple-select' && (
                  <div className="space-y-3" role="group" aria-label={question.question}>
                    {question.options?.map((option, i) => {
                      const selected = (answers[question.id] as string[])?.includes(option) || false
                      return (
                        <label
                          key={i}
                        className={`relative flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selected ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => handleOptionSelect(question.id, option)}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 ${
                          selected ? 'border-primary-500 bg-primary-500' : 'border-neutral-300'
                        }`}>
                          {selected && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-neutral-700 min-w-0 break-words">{option}</span>
                        </label>
                      )
                    })}
                  </div>
                )}

                {question.type === 'short-answer' && (
                  <div>
                    <textarea
                      value={answers[question.id] as string || ''}
                      onChange={e => handleShortAnswerChange(question.id, e.target.value)}
                      placeholder="Type your answer here..."
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-neutral-900 placeholder-neutral-400 resize-y min-h-[120px]"
                    />
                    <p className="mt-2 text-sm text-neutral-500">Your answer will be evaluated for relevance and completeness.</p>
                  </div>
                )}

                {showFeedback && question && (
                  <div className="p-4 rounded-xl border-l-4 bg-neutral-50 animate-fade-in"
                    style={{ borderColor: answers[question.id] === question.correctAnswer ? '#22c55e' : '#ef4444' }}>
                    <div className="flex items-start gap-3">
                      {answers[question.id] === question.correctAnswer ? (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-medium text-neutral-900">
                          {answers[question.id] === question.correctAnswer ? 'Correct!' : 'Incorrect'}
                        </p>
                        <p className="text-sm text-neutral-600 mt-1">{question.explanation}</p>
                        {question.type === 'short-answer' && (
                          <p className="text-sm text-neutral-500 mt-2">
                            <HelpCircle className="w-4 h-4 inline mr-1" />
                            Short answers are evaluated automatically for key concepts.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {showFeedback && !isLastQuestion && (
                  <Button variant="primary" onClick={handleNext} className="w-full">
                    Next Question <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-[auto_1fr_auto] items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handlePrevious} 
            disabled={currentQuestionIndex === 0}
            className="w-full sm:w-auto"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          <div className="col-span-2 order-first sm:order-none sm:col-span-1 flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-1">
            {Array.from({ length: totalQuestions }, (_, i) => (
              <button
                key={i}
                onClick={() => { setCurrentQuestionIndex(i); setShowFeedback(false) }}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
                  i === currentQuestionIndex
                    ? 'bg-primary-600 text-white'
                    : answers[currentQuiz.questions[i]?.id]
                      ? 'bg-green-100 text-green-700'
                      : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                }`}
                aria-label={`Question ${i + 1}`}
                aria-current={i === currentQuestionIndex ? 'step' : undefined}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {isLastQuestion && canSubmit ? (
            <Button 
              variant="primary" 
              onClick={handleSubmit} 
              loading={submitted}
              className="w-full sm:w-auto"
            >
              <span className="sm:hidden">Submit</span>
              <span className="hidden sm:inline">Submit Quiz</span>
              <CheckCircle className="w-4 h-4 ml-2" />
            </Button>
          ) : !isLastQuestion && canGoNext && !showFeedback ? (
            <Button variant="primary" onClick={() => setShowFeedback(true)} className="w-full sm:w-auto">
              <span className="sm:hidden">Check</span>
              <span className="hidden sm:inline">Check Answer</span>
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : null}
        </div>
      </main>
    </div>
  )
}