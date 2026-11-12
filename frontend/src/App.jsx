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
import AdminRoute from './pages/admin/AdminRoute'
import AdminDashboard, { QuizManagement, StudentList, ResultsList } from './pages/admin/AdminDashboard'
import Subjects from './pages/admin/Subjects'

function AdminPage({ children }) {
  return <PrivateRoute><AdminRoute><Layout>{children}</Layout></AdminRoute></PrivateRoute>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ style: { fontSize: '14px', borderRadius: '12px' } }} />
        <Routes>
          <Route path="/admin" element={<AdminPage><AdminDashboard /></AdminPage>} />
          <Route path="/admin/quizzes" element={<AdminPage><div className="mb-6"><h1 className="page-title">Quizzes</h1><p className="page-subtitle">Create, publish and manage your quizzes.</p></div><QuizManagement /></AdminPage>} />
          <Route path="/admin/students" element={<AdminPage><div className="mb-6"><h1 className="page-title">Students</h1><p className="page-subtitle">Browse all registered students and their academic details.</p></div><StudentList /></AdminPage>} />
          <Route path="/admin/results" element={<AdminPage><div className="mb-6"><h1 className="page-title">Results</h1><p className="page-subtitle">Review student performance across all quizzes.</p></div><ResultsList /></AdminPage>} />
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