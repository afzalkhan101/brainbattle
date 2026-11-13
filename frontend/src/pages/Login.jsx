import { usePreferences } from "../context/Preferences";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
export default function Login() {
  const {
    t
  } = usePreferences();
  const {
    login
  } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: ''
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      toast.error(t(err.response?.data?.detail || 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-800 flex-col justify-center items-center p-12 text-white">
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
          <GraduationCap size={32} />
        </div>
        <h1 className="text-4xl font-bold mb-3">{t("Brain Battle")}</h1>
        <p className="text-primary-200 text-center max-w-sm text-lg">{t("Your complete platform for university discovery and knowledge assessment.")}</p>
        <div className="mt-12 grid grid-cols-3 gap-4 w-full max-w-sm">
          {['Universities', 'Quizzes', 'Progress'].map(item => <div key={item} className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-sm font-medium">{t(item)}</p>
            </div>)}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <GraduationCap size={16} className="text-white" />
            </div>
            <span className="font-bold text-xl">{t("Brain Battle")}</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">{t("Welcome back")}</h2>
          <p className="text-slate-500 text-sm mb-8">{t("Sign in to your account to continue")}</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">{t("Email address")}</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" className="input pl-10" placeholder={t("you@example.com")} value={form.email} onChange={e => setForm({
                ...form,
                email: e.target.value
              })} required />
              </div>
            </div>

            <div>
              <label className="label">{t("Password")}</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPass ? 'text' : 'password'} className="input pl-10 pr-10" placeholder={"••••••••"} value={form.password} onChange={e => setForm({
                ...form,
                password: e.target.value
              })} required />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {t(loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Sign in')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">{t("Don't have an account?")}{' '}
            <Link to="/register" className="text-primary-600 font-medium hover:underline">{t("Create one")}</Link>
          </p>
        </div>
      </div>
    </div>;
}
