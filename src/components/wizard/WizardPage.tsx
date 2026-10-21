import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card'
import { Input } from '../ui/Input'
import { Progress } from '../ui/Progress'
import { Badge } from '../ui/Badge'
import { ArrowLeft, ArrowRight, Target, Clock, Brain, Layers, AlertCircle, CheckCircle } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { CourseInput, KnowledgeLevel, DepthLevel, LearningFormat } from '../../types'
import { isRealisticSchedule, estimateTotalHours } from '../../utils/helpers'

const KNOWLEDGE_LEVELS: { value: KnowledgeLevel; label: string; description: string }[] = [
  { value: 'beginner', label: 'Beginner', description: 'Little to no prior experience' },
  { value: 'intermediate', label: 'Intermediate', description: 'Some familiarity with basics' },
  { value: 'advanced', label: 'Advanced', description: 'Strong foundation, seeking depth' }
]

const DEPTH_LEVELS: { value: DepthLevel; label: string; description: string; details: string }[] = [
  { value: 'quick', label: 'Quick', description: 'Core concepts only', details: '~20 hours • Key concepts + short assessments' },
  { value: 'thorough', label: 'Thorough', description: 'Detailed + practice', details: '~35 hours • Explanations, examples, exercises' },
  { value: 'mastery', label: 'Mastery', description: 'Deep theory + projects', details: '~55 hours • Theory, implementation, final challenge' }
]

const FORMATS: { value: LearningFormat; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'text', label: 'Text', icon: '📝', description: 'Written explanations & notes' },
  { value: 'diagrams', label: 'Diagrams', icon: '📊', description: 'Visual explanations with Mermaid' },
  { value: 'audio', label: 'Audio', icon: '🔊', description: 'Text-to-speech playback' },
  { value: 'practice', label: 'Practice', icon: '💻', description: 'Hands-on exercises & quizzes' }
]

const STEPS = [
  { id: 'subject', title: 'What to Learn', icon: <Target className="w-5 h-5" /> },
  { id: 'level', title: 'Your Level', icon: <Brain className="w-5 h-5" /> },
  { id: 'time', title: 'Time & Duration', icon: <Clock className="w-5 h-5" /> },
  { id: 'depth', title: 'Depth', icon: <Layers className="w-5 h-5" /> },
  { id: 'formats', title: 'Preferences', icon: '⚙️' },
  { id: 'review', title: 'Review', icon: '📋' }
]

export const WizardPage: React.FC = () => {
  const navigate = useNavigate()
  const { startCourse } = useApp()
  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [formData, setFormData] = useState<CourseInput>({
    subject: '',
    knowledgeLevel: 'beginner',
    timePerDayMinutes: 30,
    targetDurationDays: 30,
    depth: 'thorough',
    preferredFormats: ['text', 'diagrams', 'practice']
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const stepIds = STEPS.map(s => s.id)
  const currentStepId = stepIds[currentStep]

  const validateStep = (stepId: string): boolean => {
    const stepErrors: Record<string, string> = {}
    
    switch (stepId) {
      case 'subject':
        if (!formData.subject.trim()) stepErrors.subject = 'Subject is required'
        else if (formData.subject.trim().length < 3) stepErrors.subject = 'Subject must be at least 3 characters'
        break
      case 'level':
        if (!formData.knowledgeLevel) stepErrors.knowledgeLevel = 'Please select your knowledge level'
        break
      case 'time':
        if (formData.timePerDayMinutes < 5) stepErrors.timePerDayMinutes = 'Minimum 5 minutes per day'
        if (formData.targetDurationDays < 1) stepErrors.targetDurationDays = 'Minimum 1 day'
        if (formData.timePerDayMinutes > 480) stepErrors.timePerDayMinutes = 'Maximum 8 hours per day'
        if (formData.targetDurationDays > 365) stepErrors.targetDurationDays = 'Maximum 365 days'
        break
      case 'depth':
        if (!formData.depth) stepErrors.depth = 'Please select a depth level'
        break
      case 'formats':
        if (formData.preferredFormats.length === 0) stepErrors.preferredFormats = 'Select at least one format'
        break
    }
    
    setErrors(prev => ({ ...prev, ...stepErrors }))
    return Object.keys(stepErrors).length === 0
  }

  const handleNext = () => {
    setTouched(prev => ({ ...prev, [currentStepId]: true }))
    if (validateStep(currentStepId)) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(prev => prev + 1)
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const generateCourse = async () => {
    const allValid = stepIds.every(id => validateStep(id))
    if (!allValid) {
      const firstErrorStep = stepIds.findIndex(id => errors[id] || (touched[id] && validateStep(id)))
      if (firstErrorStep >= 0) setCurrentStep(firstErrorStep)
      return
    }

    setSubmitting(true)
    setLocalError(null)
    try {
      await startCourse(formData)
      navigate('/dashboard')
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Failed to create course. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await generateCourse()
  }

  const updateField = <K extends keyof CourseInput>(field: K, value: CourseInput[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => { const next = { ...prev }; delete next[field]; return next })
    }
  }

  const toggleFormat = (format: LearningFormat) => {
    const formats = formData.preferredFormats.includes(format)
      ? formData.preferredFormats.filter(f => f !== format)
      : [...formData.preferredFormats, format]
    updateField('preferredFormats', formats)
  }

  const totalHours = estimateTotalHours(formData)
  const scheduleCheck = isRealisticSchedule(formData)

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
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
          </div>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8" role="navigation" aria-label="Wizard progress">
          <Progress value={((currentStep + 1) / STEPS.length) * 100} size="sm" className="mb-4" />
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center relative">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all
                  ${index < currentStep 
                    ? 'bg-primary-600 text-white' 
                    : index === currentStep 
                      ? 'bg-primary-100 text-primary-600 ring-4 ring-primary-100' 
                      : 'bg-neutral-200 text-neutral-500'
                  }
                `}>
                  {index < currentStep ? (
                    <CheckCircle className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    step.icon
                  )}
                </div>
                <span className={`mt-1.5 text-xs font-medium ${index <= currentStep ? 'text-neutral-700' : 'text-neutral-400'}`}>
                  {step.title}
                </span>
                {index < STEPS.length - 1 && (
                  <div className={`absolute top-5 left-1/2 w-full h-1 -translate-x-1/2 ${index < currentStep ? 'bg-primary-600' : 'bg-neutral-200'}`} aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-6">
            {localError && (
              <div role="alert" className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1">
                  <p className="font-medium text-red-800">Could not generate your curriculum</p>
                  <p className="text-sm text-red-700 mt-1">{localError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLocalError(null)}
                  className="text-sm text-red-600 hover:text-red-800 underline"
                >
                  Dismiss
                </button>
              </div>
            )}
            {/* Step 1: Subject */}
            {currentStep === 0 && (
              <Card variant="elevated" padding="lg">
                <CardHeader>
                  <CardTitle>What do you want to learn?</CardTitle>
                  <CardDescription>Be specific — "React hooks" is better than "programming"</CardDescription>
                </CardHeader>
                <CardContent>
                  <Input
                    label="Subject or learning goal"
                    placeholder="e.g., TypeScript generics, Spanish conversation, Machine learning fundamentals"
                    value={formData.subject}
                    onChange={e => updateField('subject', e.target.value)}
                    onBlur={() => setTouched(prev => ({ ...prev, subject: true }))}
                    error={touched.subject ? errors.subject : undefined}
                    autoFocus
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    {['React hooks', 'Python basics', 'Spanish A1', 'Data structures', 'SQL queries', 'CSS Grid'].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => updateField('subject', s)}
                        className="px-3 py-1.5 text-sm rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Knowledge Level */}
            {currentStep === 1 && (
              <Card variant="elevated" padding="lg">
                <CardHeader>
                  <CardTitle>What's your current knowledge level?</CardTitle>
                  <CardDescription>This helps us start at the right difficulty</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3" role="radiogroup" aria-label="Knowledge level">
                    {KNOWLEDGE_LEVELS.map(level => (
                      <label
                        key={level.value}
                        className={`relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          formData.knowledgeLevel === level.value
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="knowledgeLevel"
                          value={level.value}
                          checked={formData.knowledgeLevel === level.value}
                          onChange={() => updateField('knowledgeLevel', level.value)}
                          className="sr-only"
                          aria-describedby={`${level.value}-desc`}
                        />
                        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 flex-shrink-0 ${
                          formData.knowledgeLevel === level.value ? 'border-primary-500 bg-primary-500' : 'border-neutral-300'
                        }">
                          {formData.knowledgeLevel === level.value && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div>
                          <div className="font-medium text-neutral-900">{level.label}</div>
                          <div id={`${level.value}-desc`} className="text-sm text-neutral-500">{level.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  {touched.knowledgeLevel && errors.knowledgeLevel && (
                    <p className="mt-2 text-sm text-red-600" role="alert">{errors.knowledgeLevel}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 3: Time & Duration */}
            {currentStep === 2 && (
              <Card variant="elevated" padding="lg">
                <CardHeader>
                  <CardTitle>How much time can you dedicate?</CardTitle>
                  <CardDescription>Consistency beats intensity. Be realistic about your daily availability.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <Input
                        label="Minutes per day"
                        type="number"
                        min={5}
                        max={480}
                        value={formData.timePerDayMinutes}
                        onChange={e => updateField('timePerDayMinutes', parseInt(e.target.value) || 0)}
                        onBlur={() => setTouched(prev => ({ ...prev, timePerDayMinutes: true }))}
                        error={touched.timePerDayMinutes ? errors.timePerDayMinutes : undefined}
                        helperText="15-60 minutes recommended"
                      />
                    </div>
                    <div>
                      <Input
                        label="Target duration (days)"
                        type="number"
                        min={1}
                        max={365}
                        value={formData.targetDurationDays}
                        onChange={e => updateField('targetDurationDays', parseInt(e.target.value) || 0)}
                        onBlur={() => setTouched(prev => ({ ...prev, targetDurationDays: true }))}
                        error={touched.targetDurationDays ? errors.targetDurationDays : undefined}
                        helperText="30-90 days typical"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-neutral-50 rounded-xl">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-600">Total study time</span>
                      <span className="font-semibold text-neutral-900">{totalHours}h</span>
                    </div>
                    <div className="mt-2 h-2 bg-neutral-200 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-600 rounded-full transition-all" style={{ width: `${Math.min(100, (totalHours / 50) * 100)}%` }} />
                    </div>
                    {scheduleCheck.warning && currentStep >= 3 && (
                      <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <p className="text-sm text-amber-800">{scheduleCheck.warning}</p>
                      </div>
                    )}
                    {!scheduleCheck.realistic && currentStep >= 3 && (
                      <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <p className="text-sm text-red-800">{scheduleCheck.warning}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Depth */}
            {currentStep === 3 && (
              <Card variant="elevated" padding="lg">
                <CardHeader>
                  <CardTitle>How deeply do you want to learn?</CardTitle>
                  <CardDescription>Choose based on your goals and available time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3" role="radiogroup" aria-label="Learning depth">
                    {DEPTH_LEVELS.map(level => (
                      <label
                        key={level.value}
                        className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          formData.depth === level.value
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="depth"
                          value={level.value}
                          checked={formData.depth === level.value}
                          onChange={() => updateField('depth', level.value)}
                          className="sr-only"
                        />
                        <div className="flex items-start gap-4">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 flex-shrink-0 mt-0.5 ${
                            formData.depth === level.value ? 'border-primary-500 bg-primary-500' : 'border-neutral-300'
                          }`}>
                            {formData.depth === level.value && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-neutral-900">{level.label}</span>
                              <Badge variant="primary" size="sm">{level.description}</Badge>
                            </div>
                            <div className="text-sm text-neutral-500 mt-1">{level.details}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 5: Formats */}
            {currentStep === 4 && (
              <Card variant="elevated" padding="lg">
                <CardHeader>
                  <CardTitle>Preferred learning formats</CardTitle>
                  <CardDescription>Select all that apply — we'll include these in your lessons</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-3" role="group" aria-label="Learning formats">
                    {FORMATS.map(format => (
                      <label
                        key={format.value}
                        className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                          formData.preferredFormats.includes(format.value)
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.preferredFormats.includes(format.value)}
                          onChange={() => toggleFormat(format.value)}
                          className="sr-only"
                        />
                        <span className="text-2xl" aria-hidden="true">{format.icon}</span>
                        <div>
                          <div className="font-medium text-neutral-900">{format.label}</div>
                          <div className="text-sm text-neutral-500">{format.description}</div>
                        </div>
                        {formData.preferredFormats.includes(format.value) && (
                          <CheckCircle className="w-5 h-5 text-primary-500 ml-auto" aria-hidden="true" />
                        )}
                      </label>
                    ))}
                  </div>
                  {touched.preferredFormats && errors.preferredFormats && (
                    <p className="mt-2 text-sm text-red-600" role="alert">{errors.preferredFormats}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 6: Review */}
            {currentStep === 5 && (
              <Card variant="elevated" padding="lg">
                <CardHeader>
                  <CardTitle>Review your settings</CardTitle>
                  <CardDescription>Everything looks good? Let's generate your curriculum.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-neutral-50 rounded-xl">
                      <div className="flex items-start gap-3">
                        <Target className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <p className="text-sm text-neutral-500">Subject</p>
                          <p className="font-medium text-neutral-900">{formData.subject || 'Not set'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-neutral-50 rounded-xl">
                      <div className="flex items-start gap-3">
                        <Brain className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <p className="text-sm text-neutral-500">Knowledge Level</p>
                          <p className="font-medium text-neutral-900">{KNOWLEDGE_LEVELS.find(l => l.value === formData.knowledgeLevel)?.label}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-neutral-50 rounded-xl">
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <p className="text-sm text-neutral-500">Schedule</p>
                          <p className="font-medium text-neutral-900">
                            {formData.timePerDayMinutes} min/day × {formData.targetDurationDays} days = {totalHours}h total
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-neutral-50 rounded-xl">
                      <div className="flex items-start gap-3">
                        <Layers className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <p className="text-sm text-neutral-500">Depth</p>
                          <p className="font-medium text-neutral-900">{DEPTH_LEVELS.find(l => l.value === formData.depth)?.label}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-neutral-50 rounded-xl">
                      <div className="flex items-start gap-3">
                        <span className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" aria-hidden="true">⚙️</span>
                        <div>
                          <p className="text-sm text-neutral-500">Formats</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {formData.preferredFormats.map(f => (
                              <Badge key={f} variant="primary" size="sm">
                                {FORMATS.find(fmt => fmt.value === f)?.label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="hidden sm:inline-flex"
            >
              <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
              Back
            </Button>
            <div className="flex gap-3">
              {currentStep < STEPS.length - 1 ? (
                <Button key="wizard-next" type="button" onClick={handleNext} className="w-full sm:w-auto">
                  Next <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  key="wizard-generate"
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={generateCourse}
                  loading={submitting}
                  disabled={submitting}
                  className="w-full sm:w-auto"
                >
                  {submitting ? 'Generating Curriculum...' : 'Generate Curriculum'}
                  {!submitting && <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />}
                </Button>
              )}
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}