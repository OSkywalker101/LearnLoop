import React, { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Progress } from '../ui/Progress'
import { 
  PlayCircle, PauseCircle, VolumeX, 
  ChevronLeft, ChevronRight, Target, FileText, 
  Lightbulb, Code, BookOpen, Key, 
  ArrowLeft, CheckCircle, XCircle,
  Headphones
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { LessonContent, Diagram, KeyTerm } from '../../types'
import { formatDuration } from '../../utils/helpers'

type MermaidApi = {
  initialize: (config: Record<string, unknown>) => void
  render: (id: string, code: string) => Promise<{ svg: string }>
}

let mermaidPromise: Promise<MermaidApi> | null = null

const loadMermaid = (): Promise<MermaidApi> => {
  if (mermaidPromise) return mermaidPromise
  mermaidPromise = (async () => {
    const mod = await import('mermaid/dist/mermaid.core.mjs')
    return (mod.default ?? mod) as MermaidApi
  })()
  mermaidPromise.catch(() => { mermaidPromise = null })
  return mermaidPromise
}

const normalizeMermaid = (code: string): string => {
  const trimmed = code.trim()
  if (/^(graph|flowchart)\s/i.test(trimmed)) return trimmed
  return `flowchart TD\n${trimmed}`
}

const MermaidDiagram: React.FC<{ code: string; title: string }> = ({ code, title: _title }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    if (!containerRef.current || rendered) return
    
    const render = async () => {
      let lastError: unknown
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const mermaid = await loadMermaid()
          mermaid.initialize({ 
            startOnLoad: false, 
            theme: 'base',
            themeVariables: {
              primaryColor: '#0ea5e9',
              primaryTextColor: '#171717',
              primaryBorderColor: '#0ea5e9',
              lineColor: '#525252',
              secondaryColor: '#f0f9ff',
              tertiaryColor: '#ffffff'
            },
            securityLevel: 'loose',
            fontFamily: 'Inter, system-ui, sans-serif'
          })
          
          const { svg } = await mermaid.render('ll-diagram-' + Date.now().toString(36) + '-' + attempt, normalizeMermaid(code))
          if (containerRef.current) {
            containerRef.current.innerHTML = svg
            setRendered(true)
            setError(null)
          }
          return
        } catch (e) {
          lastError = e
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
        }
      }
      setError('Failed to render diagram. Invalid syntax.')
      console.error('Mermaid error:', lastError)
    }
    
    render()
  }, [code, rendered])

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
        <div className="flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
        <details className="mt-3">
          <summary className="text-sm text-red-600 cursor-pointer">Show raw code</summary>
          <pre className="mt-2 p-3 bg-red-100 rounded text-xs overflow-x-auto text-red-900"><code>{code}</code></pre>
        </details>
      </div>
    )
  }

  return (
    <div className="bg-neutral-50 rounded-xl p-4 overflow-x-auto">
      <div ref={containerRef} className="min-w-fit [&_svg]:max-w-full [&_svg]:h-auto" />
    </div>
  )
}

const AudioPlayer: React.FC<{ text: string; onPlayChange?: (playing: boolean) => void }> = ({ text, onPlayChange }) => {
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    
    utteranceRef.current = new SpeechSynthesisUtterance(text)
    utteranceRef.current.rate = 1
    utteranceRef.current.pitch = 1
    utteranceRef.current.volume = 1
    utteranceRef.current.onend = () => {
      setPlaying(false)
      setPaused(false)
      onPlayChange?.(false)
    }
    utteranceRef.current.onpause = () => {
      setPlaying(false)
      setPaused(true)
    }
    utteranceRef.current.onresume = () => {
      setPlaying(true)
      setPaused(false)
    }
  }, [text])

  const togglePlay = () => {
    if (!utteranceRef.current) return
    
    if (playing) {
      window.speechSynthesis.pause()
      setPlaying(false)
      setPaused(true)
    } else if (paused) {
      window.speechSynthesis.resume()
      setPlaying(true)
      setPaused(false)
    } else {
      window.speechSynthesis.speak(utteranceRef.current)
      setPlaying(true)
    }
    onPlayChange?.(playing || paused)
  }

  const stop = () => {
    window.speechSynthesis.cancel()
    setPlaying(false)
    setPaused(false)
    onPlayChange?.(false)
  }

  if (!('speechSynthesis' in window)) {
    return (
      <div className="p-4 bg-neutral-100 rounded-xl text-center">
        <p className="text-sm text-neutral-500">Speech synthesis not supported in this browser</p>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-primary-50 border border-primary-100 rounded-xl">
      <Button 
        variant={playing ? 'secondary' : 'primary'} 
        size="sm"
        onClick={togglePlay}
        aria-label={playing ? 'Pause audio' : 'Play audio'}
      >
        {playing ? <PauseCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
      </Button>
      <Button variant="ghost" size="sm" onClick={stop} aria-label="Stop audio">
        <VolumeX className="w-5 h-5" />
      </Button>
      <div className="flex-1 text-sm text-neutral-700">
        {playing ? 'Playing lesson content...' : paused ? 'Paused' : 'Tap to listen to this lesson'}
      </div>
      <Headphones className="w-5 h-5 text-primary-600" />
    </div>
  )
}

export const LessonPage: React.FC = () => {
  const navigate = useNavigate()
  const { lessonId } = useParams<{ lessonId: string }>()
  const { 
    course, 
    currentLesson, 
    selectLesson, 
    startQuizForLesson,
  } = useApp()
  const [content, setContent] = useState<LessonContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizError, setQuizError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'deep-dive' | 'practice'>('overview')

  const handleTakeQuiz = async () => {
    if (!currentLesson) return
    setQuizLoading(true)
    setQuizError(null)
    try {
      await startQuizForLesson(currentLesson.id)
    } catch (e) {
      setQuizError(e instanceof Error ? e.message : 'Could not start the quiz')
    } finally {
      setQuizLoading(false)
    }
  }

  useEffect(() => {
    if (!course || !lessonId) return
    if (currentLesson?.id === lessonId) return
    let cancelled = false
    setLoading(true)
    selectLesson(lessonId)
      .catch(e => {
        if (!cancelled) console.error('Failed to load lesson content:', e)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [lessonId, course, currentLesson?.id])

  useEffect(() => {
    if (currentLesson?.content) {
      setContent(currentLesson.content)
    }
  }, [currentLesson])

  const fullText = useMemo(() => {
    if (!content) return ''
    return [
      content.objectives.join('. '),
      content.notes,
      content.detailedExplanation,
      content.analogies.join('. '),
      content.workedExamples.map(e => `${e.problem} ${e.solution} ${e.explanation}`).join('. '),
      content.keyTerms.map(t => `${t.term}: ${t.definition}`).join('. '),
      content.takeaways.join('. ')
    ].join(' ')
  }, [content])

  if (!currentLesson || !course) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-neutral-600">No lesson selected</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">Back to Dashboard</Button>
        </div>
      </div>
    )
  }

  const currentIndex = course.lessons.findIndex(l => l.id === currentLesson.id)
  const prevLesson = currentIndex > 0 ? course.lessons[currentIndex - 1] : null
  const nextLesson = currentIndex < course.lessons.length - 1 ? course.lessons[currentIndex + 1] : null

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide">
                  {course.modules.find(m => m.id === currentLesson.moduleId)?.title || 'Course'}
                </p>
                <h1 className="text-lg font-semibold text-neutral-900 truncate max-w-md">{currentLesson.title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="primary" size="sm">{formatDuration(currentLesson.estimatedMinutes)}</Badge>
              <Badge variant={currentLesson.status === 'completed' ? 'success' : 'default'} size="sm">
                {currentLesson.status}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            <span className="ml-3 text-neutral-600">Generating lesson content...</span>
          </div>
        )}

        {!loading && content && (
          <>
            <AudioPlayer text={fullText} />

            <div className="mt-6 border-b border-neutral-200">
              <nav className="flex gap-1 pb-1" role="tablist" aria-label="Lesson sections">
                {[
                  { id: 'overview', label: 'Overview', icon: <Target className="w-4 h-4" /> },
                  { id: 'deep-dive', label: 'Deep Dive', icon: <BookOpen className="w-4 h-4" /> },
                  { id: 'practice', label: 'Practice', icon: <Code className="w-4 h-4" /> }
                ].map(tab => (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    aria-controls={`panel-${tab.id}`}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {tab.icon}
                    <span className="ml-2">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div id="panel-overview" role="tabpanel" aria-labelledby="overview-tab" hidden={activeTab !== 'overview'} className="mt-6 animate-fade-in">
              <div className="space-y-6">
                <Card variant="outlined" padding="lg">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-5 h-5 text-primary-600" />
                    <h2 className="text-xl font-semibold text-neutral-900">Learning Objectives</h2>
                  </div>
                  <ul className="space-y-2">
                    {content.objectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-3 p-3 bg-neutral-50 rounded-xl">
                        <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                        <span className="text-neutral-700">{obj}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card variant="outlined" padding="lg">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-primary-600" />
                    <h2 className="text-xl font-semibold text-neutral-900">Key Takeaways</h2>
                  </div>
                  <ul className="space-y-2">
                    {content.takeaways.map((takeaway, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-neutral-700">{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                {content.diagrams.length > 0 && (
                  <Card variant="outlined" padding="lg">
                    <div className="flex items-center gap-2 mb-4">
                      <BookOpen className="w-5 h-5 text-primary-600" />
                      <h2 className="text-xl font-semibold text-neutral-900">Visual Diagrams</h2>
                    </div>
                    <div className="space-y-4">
                      {content.diagrams.map((diagram: Diagram) => (
                        <div key={diagram.id}>
                          <p className="text-sm font-medium text-neutral-800 mb-1">{diagram.title}</p>
                          <p className="text-sm text-neutral-500 mb-2">{diagram.description}</p>
                          <MermaidDiagram code={diagram.mermaidCode} title={diagram.title} />
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                <Card variant="outlined" padding="lg">
                  <div className="flex items-center gap-2 mb-4">
                    <Key className="w-5 h-5 text-primary-600" />
                    <h2 className="text-xl font-semibold text-neutral-900">Key Terms</h2>
                  </div>
                  <dl className="space-y-3">
                    {content.keyTerms.map((term: KeyTerm) => (
                      <div key={term.term} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-neutral-50 rounded-xl">
                        <dt className="font-medium text-neutral-900">{term.term}</dt>
                        <dd className="text-neutral-600">{term.definition}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              </div>
            </div>

            <div id="panel-deep-dive" role="tabpanel" aria-labelledby="deep-dive-tab" hidden={activeTab !== 'deep-dive'} className="mt-6 animate-fade-in">
              <div className="space-y-6">
                <Card variant="outlined" padding="lg">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-primary-600" />
                    <h2 className="text-xl font-semibold text-neutral-900">Concise Notes</h2>
                  </div>
                  <p className="text-neutral-700 whitespace-pre-wrap">{content.notes}</p>
                </Card>

                <Card variant="outlined" padding="lg">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="w-5 h-5 text-primary-600" />
                    <h2 className="text-xl font-semibold text-neutral-900">Detailed Explanation</h2>
                  </div>
                  <div className="prose prose-neutral max-w-none">
                    <p className="text-neutral-700 whitespace-pre-wrap">{content.detailedExplanation}</p>
                  </div>
                </Card>

                {content.analogies.length > 0 && (
                  <Card variant="outlined" padding="lg">
                    <div className="flex items-center gap-2 mb-4">
                      <Lightbulb className="w-5 h-5 text-amber-600" />
                      <h2 className="text-xl font-semibold text-neutral-900">Intuitive Analogies</h2>
                    </div>
                    <div className="space-y-4">
                      {content.analogies.map((analogy, i) => (
                        <div key={i} className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                          <p className="text-neutral-800">{analogy}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {content.workedExamples.length > 0 && (
                  <Card variant="outlined" padding="lg">
                    <div className="flex items-center gap-2 mb-4">
                      <Code className="w-5 h-5 text-primary-600" />
                      <h2 className="text-xl font-semibold text-neutral-900">Worked Examples</h2>
                    </div>
                    <div className="space-y-6">
                      {content.workedExamples.map((example, i) => (
                        <div key={i} className="space-y-3">
                          <h3 className="font-medium text-neutral-900">{example.title}</h3>
                          <div className="p-4 bg-neutral-100 rounded-lg">
                            <p className="text-sm text-neutral-500 mb-2">Problem</p>
                            <p className="text-neutral-900">{example.problem}</p>
                          </div>
                          <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                            <p className="text-sm text-green-700 mb-2">Solution</p>
                            <pre className="bg-green-100 p-3 rounded text-sm overflow-x-auto"><code>{example.solution}</code></pre>
                          </div>
                          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                            <p className="text-sm text-blue-700 mb-2">Explanation</p>
                            <p className="text-neutral-800">{example.explanation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            </div>

            <div id="panel-practice" role="tabpanel" aria-labelledby="practice-tab" hidden={activeTab !== 'practice'} className="mt-6 animate-fade-in">
              <Card variant="outlined" padding="lg">
                <div className="flex items-center gap-2 mb-4">
                  <Code className="w-5 h-5 text-primary-600" />
                  <h2 className="text-xl font-semibold text-neutral-900">Knowledge Check</h2>
                </div>
                <p className="text-neutral-600 mb-6">Test your understanding before taking the quiz.</p>
                
                {content.workedExamples.map((example, i) => (
                  <div key={i} className="mb-6 p-4 bg-neutral-50 rounded-xl">
                    <h3 className="font-medium text-neutral-900 mb-3">{example.title}</h3>
                    <p className="text-neutral-700 mb-4">{example.problem}</p>
                    <details className="group">
                      <summary className="flex items-center gap-2 cursor-pointer text-primary-600 font-medium hover:text-primary-700">
                        <Code className="w-4 h-4" />
                        Show Solution
                        <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                      </summary>
                      <div className="mt-3 p-3 bg-white rounded-lg border border-neutral-200">
                        <pre className="text-sm overflow-x-auto"><code>{example.solution}</code></pre>
                        <p className="text-sm text-neutral-600 mt-2">{example.explanation}</p>
                      </div>
                    </details>
                  </div>
                ))}

                <div className="pt-6 border-t border-neutral-200">
                  <Button 
                    size="lg" 
                    onClick={handleTakeQuiz}
                    loading={quizLoading}
                    disabled={quizLoading}
                    className="w-full"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {quizLoading ? 'Building your quiz...' : 'Take Quiz'}
                  </Button>
                  {quizError && (
                    <p role="alert" className="mt-3 text-sm text-red-600 text-center">{quizError}</p>
                  )}
                </div>
              </Card>
            </div>

            <div className="mt-8 flex items-center justify-between pt-6 border-t border-neutral-200">
              <Button 
                variant="outline" 
                onClick={() => { if (prevLesson) selectLesson(prevLesson.id).catch(() => {}) }}
                disabled={!prevLesson || prevLesson.status === 'locked'}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous Lesson
              </Button>
              <div className="flex items-center gap-4 text-sm text-neutral-500">
                <span>Lesson {currentIndex + 1} of {course.lessons.length}</span>
                <Progress value={((currentIndex + 1) / course.lessons.length) * 100} max={100} size="sm" className="w-32" />
              </div>
              <Button 
                variant="primary" 
                onClick={() => { if (nextLesson) selectLesson(nextLesson.id).catch(() => {}) }}
                disabled={!nextLesson || nextLesson.status === 'locked'}
              >
                Next Lesson
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}