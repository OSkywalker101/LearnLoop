import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Card, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { ArrowRight, Target, Zap, Brain, Clock, CheckCircle } from 'lucide-react'

const features = [
  {
    icon: Target,
    title: 'Personalized Curriculum',
    description: 'AI generates a structured learning path based on your goals, time, and current knowledge.'
  },
  {
    icon: Brain,
    title: 'Adaptive Learning',
    description: 'Lessons adjust in real-time based on quiz performance. Weak areas get revisited automatically.'
  },
  {
    icon: Zap,
    title: 'Time-Aware Scheduling',
    description: 'Daily study plans that fit your schedule. No overwhelming sessions — just consistent progress.'
  },
  {
    icon: Clock,
    title: 'Spaced Repetition',
    description: 'Smart review scheduling ensures long-term retention without cramming.'
  }
]

const sampleLesson = {
  title: 'Lesson 3: Understanding Closures',
  module: 'Module 2: Core Concepts',
  duration: '25 min',
  progress: 65,
  blocks: [
    { type: 'objectives', label: 'Learning Objectives', icon: <Target className="w-5 h-5 text-primary-600" /> },
    { type: 'notes', label: 'Concise Notes', icon: '📝' },
    { type: 'explanation', label: 'Detailed Explanation', icon: <Brain className="w-5 h-5 text-primary-600" /> },
    { type: 'analogy', label: 'Intuitive Analogy', icon: '💡' },
    { type: 'example', label: 'Worked Example', icon: '💻' },
    { type: 'quiz', label: 'Knowledge Check (4 questions)', icon: <CheckCircle className="w-5 h-5 text-primary-600" /> }
  ]
}

export const LandingPage: React.FC = () => {
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
            <div className="hidden md:flex items-center gap-4">
              <Link to="/login" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
                How it works
              </Link>
              <Link to="/login" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
                Features
              </Link>
              <Link to="/login"><Button variant="primary" size="sm">Start Learning</Button></Link>
            </div>
            <Link to="/login" className="md:hidden">
              <Button variant="primary" size="sm">Start Learning</Button>
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-32" aria-labelledby="hero-heading">
          <div className="text-center max-w-3xl mx-auto">
            <h1 id="hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 tracking-tight leading-tight">
              Learn <span className="text-primary-600">Anything</span>, Adaptively
            </h1>
            <p className="mt-6 text-base sm:text-lg xl:text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
              Tell us what you want to learn, how much time you have, and how deep you want to go. 
              LearnLoop builds a personalized curriculum, breaks it into realistic lessons, and adapts 
              based on your quiz performance — like Duolingo meets a personal AI tutor.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login"><Button size="lg" className="w-full sm:w-auto">Start Learning Free <ArrowRight className="w-5 h-5" aria-hidden="true" /></Button></Link>
              <Link to="/login"><Button variant="outline" size="lg" className="w-full sm:w-auto">View Demo Course</Button></Link>
            </div>
            <p className="mt-6 text-sm text-neutral-500">
              Sign in or try the demo · Runs entirely in your browser · Zero cost
            </p>
          </div>
        </section>

        <section className="bg-white border-y border-neutral-200" aria-labelledby="features-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
            <div className="text-center mb-16">
              <h2 id="features-heading" className="text-3xl sm:text-4xl font-bold text-neutral-900">
                How LearnLoop Works
              </h2>
              <p className="mt-4 text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto">
                Four steps from goal to mastery — no rigid templates, just your personalized path.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card key={index} variant="outlined" padding="lg" className="h-full">
                  <CardContent>
                    <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-2">{feature.title}</h3>
                    <p className="text-neutral-600">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24" aria-labelledby="preview-heading">
          <div className="text-center mb-12">
            <h2 id="preview-heading" className="text-3xl sm:text-4xl font-bold text-neutral-900">
              Inside a Lesson
            </h2>
            <p className="mt-4 text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto">
              Rich, structured content blocks — not just AI-generated walls of text.
            </p>
          </div>
          <Card variant="elevated" padding="lg">
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <Badge variant="primary" size="sm" className="mb-2">{sampleLesson.module}</Badge>
                  <h3 className="text-lg sm:text-xl font-semibold text-neutral-900">{sampleLesson.title}</h3>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 text-sm text-neutral-500 w-full sm:w-auto shrink-0">
                  <span className="flex items-center gap-1.5">{sampleLesson.duration}</span>
                  <div className="w-32 h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-600 rounded-full transition-all" style={{ width: `${sampleLesson.progress}%` }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sampleLesson.blocks.map((block, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors">
                  <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-lg" aria-hidden="true">
                    {block.icon}
                  </span>
                  <div>
                    <p className="font-medium text-neutral-900">{block.label}</p>
                    <p className="text-xs text-neutral-500">Interactive content block</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="bg-primary-600" aria-labelledby="cta-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 text-center">
            <h2 id="cta-heading" className="text-3xl sm:text-4xl font-bold text-white">
              Ready to start learning?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-primary-100 max-w-2xl mx-auto">
              Create your first personalized curriculum in under 2 minutes. No credit card, no installation.
            </p>
            <div className="mt-8">
              <Link to="/login"><Button size="lg" variant="secondary" className="w-full sm:w-auto">Start Learning Now <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" /></Button></Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-neutral-200" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-primary-600" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <rect width="32" height="32" rx="8" fill="currentColor"/>
                <path d="M16 6C10.477 6 6 10.477 6 16C6 21.523 10.477 26 16 26C21.523 26 26 21.523 26 16C26 10.477 21.523 6 16 6ZM16 4C22.627 4 28 9.373 28 16C28 22.627 22.627 28 16 28C9.373 28 4 22.627 4 16C4 9.373 9.373 4 16 4Z" fill="white"/>
                <path d="M11 12H21M11 16H19M11 20H17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="24" cy="8" r="3" fill="#22c55e"/>
              </svg>
              <span className="font-semibold text-neutral-900">LearnLoop</span>
            </div>
            <p className="text-sm text-neutral-500">
              A portfolio project demonstrating adaptive AI learning. Built with React, TypeScript, and Tailwind CSS.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}