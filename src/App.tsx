import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { LandingPage } from './components/landing/LandingPage'
import { LoginPage } from './components/auth/LoginPage'
import { WizardPage } from './components/wizard/WizardPage'
import { DashboardPage } from './components/dashboard/DashboardPage'
import { LessonPage } from './components/lesson/LessonPage'
import { QuizPage } from './components/quiz/QuizPage'
import { ResultsPage } from './components/quiz/ResultsPage'
import { ProgressPage } from './components/progress/ProgressPage'
import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useApp()
  const location = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}

function AppRoutes() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/wizard" element={<RequireAuth><WizardPage /></RequireAuth>} />
        <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path="/lesson/:lessonId" element={<RequireAuth><LessonPage /></RequireAuth>} />
        <Route path="/quiz" element={<RequireAuth><QuizPage /></RequireAuth>} />
        <Route path="/results" element={<RequireAuth><ResultsPage /></RequireAuth>} />
        <Route path="/progress" element={<RequireAuth><ProgressPage /></RequireAuth>} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  )
}

export default App
