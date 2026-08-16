import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useApp } from './context/AppContext'
import { WelcomePage } from './routes/WelcomePage'
import { MenuPage } from './routes/MenuPage'
import { LessonPage } from './routes/LessonPage'
import { RewardsPage } from './routes/RewardsPage'
import { TeacherPage } from './routes/TeacherPage'
import { SettingsPage } from './routes/SettingsPage'

function StudentRoute({ children }: { children: ReactNode }) {
  const { currentStudent } = useApp()
  return currentStudent ? children : <Navigate to="/" replace />
}

export default function App() {
  const { currentStudent } = useApp()
  return (
    <Routes>
      <Route path="/" element={currentStudent ? <Navigate to="/menu" replace /> : <WelcomePage />} />
      <Route path="/menu" element={<StudentRoute><MenuPage /></StudentRoute>} />
      <Route path="/lesson/:letter" element={<StudentRoute><LessonPage /></StudentRoute>} />
      <Route path="/rewards" element={<StudentRoute><RewardsPage /></StudentRoute>} />
      <Route path="/teacher" element={<TeacherPage />} />
      <Route path="/settings" element={<StudentRoute><SettingsPage /></StudentRoute>} />
      <Route path="*" element={<Navigate to={currentStudent ? '/menu' : '/'} replace />} />
    </Routes>
  )
}
