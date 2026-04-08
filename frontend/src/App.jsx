import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Universities from './pages/Universities'
import Quizzes from './pages/Quizzes'
import QuizDetail from './pages/QuizDetail'
import MyAttempts from './pages/MyAttempts'
import Wallet from './pages/Wallet'
import Profile from './pages/Profile'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ style: { fontSize: '14px', borderRadius: '12px' } }} />
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"    element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
          <Route path="/universities" element={<PrivateRoute><Layout><Universities /></Layout></PrivateRoute>} />
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