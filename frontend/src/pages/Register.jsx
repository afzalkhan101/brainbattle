import { usePreferences } from "../context/Preferences";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Mail, Lock, User, Eye, EyeOff, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
const CLASS_LEVEL_OPTIONS = [{
  value: '',
  label: 'Select'
}, {
  value: 'class_6',
  label: 'Class 6'
}, {
  value: 'class_7',
  label: 'Class 7'
}, {
  value: 'class_8',
  label: 'Class 8'
}, {
  value: 'class_9',
  label: 'Class 9'
}, {
  value: 'class_10',
  label: 'Class 10'
}, {
  value: 'ssc',
  label: 'SSC'
}, {
  value: 'hsc',
  label: 'HSC'
}, {
  value: 'admission',
  label: 'Admission'
}];
export default function Register() {
  const {
    t
  } = usePreferences();
  const {
    register
  } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirm: '',
    phone: '',
    role: 'student',
    class_level: '',
    referred_by_code: ''
  });
  const set = k => e => setForm(f => ({
    ...f,
    [k]: e.target.value
  }));
  const handleSubmit = async e => {
    e.preventDefault();
    if (form.password !== form.password_confirm) {
      toast.error(t('Passwords do not match'));
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form
      };
      if (!payload.phone) delete payload.phone;
      if (!payload.class_level) delete payload.class_level;
      if (!payload.referred_by_code) delete payload.referred_by_code;
      await register(payload);
      navigate('/dashboard');
      toast.success(t('Account created!'));
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        Object.values(data).flat().forEach(msg => toast.error(t(msg)));
      } else {
        toast.error(t('Registration failed'));
      }
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-800 flex-col justify-center items-center p-12 text-white">
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
          <GraduationCap size={32} />
        </div>
        <h1 className="text-4xl font-bold mb-3">{t("Brain Battle")}</h1>
        <p className="text-primary-200 text-center max-w-sm text-lg leading-relaxed">{t("Join thousands of students and educators on Bangladesh's premier education platform.")}</p>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 overflow-y-auto">
        <div className="w-full max-w-sm py-6">
          <div className="flex lg:hidden items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <GraduationCap size={16} className="text-white" />
            </div>
            <span className="font-bold text-xl">{t("Brain Battle")}</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">{t("Create account")}</h2>
          <p className="text-slate-500 text-sm mb-6">{t("Fill in your details to get started")}</p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t("First name")}</label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="input pl-9" placeholder={t("John")} value={form.first_name} onChange={set('first_name')} required />
                </div>
              </div>
              <div>
                <label className="label">{t("Last name")}</label>
                <input className="input" placeholder={t("Doe")} value={form.last_name} onChange={set('last_name')} required />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="label">{t("Email")}</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" className="input pl-9" placeholder={t("you@example.com")} value={form.email} onChange={set('email')} required />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label">{t("Password")}</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPass ? 'text' : 'password'} className="input pl-9 pr-10" placeholder={t("Min. 8 characters")} value={form.password} onChange={set('password')} required minLength={8} />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="label">{t("Confirm password")}</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showConfirm ? 'text' : 'password'} className="input pl-9 pr-10" placeholder={t("Re-enter password")} value={form.password_confirm} onChange={set('password_confirm')} required minLength={8} />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Role & Class Level */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t("Role")}</label>
                <select className="input" value={form.role} onChange={set('role')}>
                  <option value="student">{t("Student")}</option>
                  <option value="coaching_center_owner">{t("Coaching Owner")}</option>
                  <option value="university_admin">{t("University Admin")}</option>
                </select>
              </div>
              <div>
                <label className="label">{t("Class Level")}</label>
                <select className="input" value={form.class_level} onChange={set('class_level')}>
                  {CLASS_LEVEL_OPTIONS.map(({
                  value,
                  label
                }) => <option key={value} value={value}>{t(label)}</option>)}
                </select>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="label">{t("Phone ")}<span className="text-slate-400 font-normal">{t("(optional)")}</span></label>
              <div className="relative">
                <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="input pl-9" placeholder={"+880..."} value={form.phone} onChange={set('phone')} />
              </div>
            </div>

            {/* Referral */}
            <div>
              <label className="label">{t("Referral Code ")}<span className="text-slate-400 font-normal">{t("(optional)")}</span></label>
              <input className="input" placeholder={t("Enter referral code")} value={form.referred_by_code} onChange={set('referred_by_code')} />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 mt-2">
              {t(loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Create account')}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">{t("Already have an account?")}{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">{t("Sign in")}</Link>
          </p>
        </div>
      </div>
    </div>;
}
