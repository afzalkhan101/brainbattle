import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Quizzes from './pages/Quizzes'
import QuizDetail from './pages/QuizDetail'
import MyAttempts from './pages/MyAttempts'
import Wallet from './pages/Wallet'
import Profile from './pages/Profile'
import { usePreferences } from './context/Preferences'
import PreferenceControls from './components/PreferenceControls'
import { useLocation } from 'react-router-dom'
import AdminRoute from './pages/admin/AdminRoute'
import AdminDashboard, { QuizManagement, StudentList, ResultsList } from './pages/admin/AdminDashboard'
import Subjects from './pages/admin/Subjects'
import Practice from './pages/learning/Practice'
import Contests from './pages/learning/Contests'
import ContestRoom from './pages/learning/ContestRoom'
import QuestionBank from './pages/learning/QuestionBank'
import ManageContests from './pages/learning/ManageContests'

function AdminPage({ children }) {
  return <PrivateRoute><AdminRoute><Layout>{children}</Layout></AdminRoute></PrivateRoute>
}

function PublicPreferences() {
  const { pathname } = useLocation()
  return ['/login', '/register'].includes(pathname) ? <PreferenceControls floating /> : null
}

export default function App() {
  const { t, theme } = usePreferences()
  return (
    <AuthProvider>
      <BrowserRouter>
        <PublicPreferences />
        <Toaster position="top-right" toastOptions={{ style: { fontSize: '14px', borderRadius: '12px', background: theme === 'dark' ? '#0f172a' : '#ffffff', color: theme === 'dark' ? '#e2e8f0' : '#0f172a' } }} />
        <Routes>
          <Route path="/practice" element={<PrivateRoute><Layout><Practice /></Layout></PrivateRoute>} />
          <Route path="/contests" element={<PrivateRoute><Layout><Contests /></Layout></PrivateRoute>} />
          <Route path="/contests/:id" element={<PrivateRoute><Layout><ContestRoom /></Layout></PrivateRoute>} />
          <Route path="/admin/question-bank" element={<AdminPage><QuestionBank /></AdminPage>} />
          <Route path="/admin/contests" element={<AdminPage><ManageContests /></AdminPage>} />
          <Route path="/admin" element={<AdminPage><AdminDashboard /></AdminPage>} />
          <Route path="/admin/quizzes" element={<AdminPage><div className="mb-6"><h1 className="page-title">{t('Quizzes')}</h1><p className="page-subtitle">{t('Create, publish and manage your quizzes.')}</p></div><QuizManagement /></AdminPage>} />
          <Route path="/admin/students" element={<AdminPage><div className="mb-6"><h1 className="page-title">{t('Students')}</h1><p className="page-subtitle">{t('Browse all registered students and their academic details.')}</p></div><StudentList /></AdminPage>} />
          <Route path="/admin/results" element={<AdminPage><div className="mb-6"><h1 className="page-title">{t('Results')}</h1><p className="page-subtitle">{t('Review student performance across all quizzes.')}</p></div><ResultsList /></AdminPage>} />
          <Route path="/admin/subjects" element={<AdminPage><Subjects /></AdminPage>} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"    element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
          <Route path="/quizzes"      element={<PrivateRoute><Layout><Quizzes /></Layout></PrivateRoute>} />
          <Route path="/quizzes/:id"  element={<PrivateRoute><Layout><QuizDetail /></Layout></PrivateRoute>} />
          <Route path="/my-attempts"  element={<PrivateRoute><Layout><MyAttempts /></Layout></PrivateRoute>} />
          <Route path="/wallet"       element={<PrivateRoute><Layout><Wallet /></Layout></PrivateRoute>} />
          <Route path="/profile"      element={<PrivateRoute><Layout><Profile /></Layout></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}