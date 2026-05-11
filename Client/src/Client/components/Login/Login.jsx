import * as React from 'react';
import axios from 'axios';
import { useFormik } from 'formik';
import { Eye, EyeOff, School, Users, GraduationCap } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { loginSchema } from '../../../yupSchema/loginSchema';
import { AuthContext } from '../../../context/AuthContext';
import { baseApi } from '../../../environment';
import { Spinner, Modal } from '../../../components/ui';

const roleConfig = {
  school: {
    title: 'School Admin', description: 'Administrative Dashboard',
    tagline: 'Manage your school efficiently – from classrooms to reports, all in one place.',
    gradient: 'bg-gradient-to-br from-orange-500 to-red-600',
    accentText: 'text-orange-400', badgeBg: 'bg-orange-500/15', badgeText: 'text-orange-400',
    btnGradient: 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600',
    ringColor: 'focus:ring-orange-500/30 focus:border-orange-500',
    mobileLogoFilter: '[filter:invert(58%)_sepia(74%)_saturate(1200%)_hue-rotate(1deg)_brightness(101%)_contrast(101%)]',
    bigIcon: <School className="w-14 h-14 text-white" />,
    smallIcon: <School className="w-4 h-4" />,
    features: ['Manage Classes & Timetables', 'Track Student Attendance', 'Publish School Notices', 'Examination Management', 'Teacher Administration'],
  },
  teacher: {
    title: 'Teacher', description: 'Teaching Dashboard',
    tagline: 'Stay on top of your classes, track student progress, and collaborate effectively.',
    gradient: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    accentText: 'text-blue-400', badgeBg: 'bg-blue-500/15', badgeText: 'text-blue-400',
    btnGradient: 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600',
    ringColor: 'focus:ring-blue-500/30 focus:border-blue-500',
    mobileLogoFilter: '[filter:invert(42%)_sepia(80%)_saturate(800%)_hue-rotate(200deg)_brightness(100%)_contrast(100%)]',
    bigIcon: <Users className="w-14 h-14 text-white" />,
    smallIcon: <Users className="w-4 h-4" />,
    features: ['View Your Weekly Schedule', 'Mark & Track Attendance', 'Grade Examinations', 'Receive School Notices', 'Coordinate with Admin'],
  },
  student: {
    title: 'Student', description: 'Student Portal',
    tagline: 'Access your classes, track your attendance, and stay informed about your school activities.',
    gradient: 'bg-gradient-to-br from-green-600 to-green-700',
    accentText: 'text-green-400', badgeBg: 'bg-green-600/15', badgeText: 'text-green-400',
    btnGradient: 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800',
    ringColor: 'focus:ring-green-500/30 focus:border-green-500',
    mobileLogoFilter: '[filter:invert(48%)_sepia(60%)_saturate(600%)_hue-rotate(120deg)_brightness(95%)_contrast(100%)]',
    bigIcon: <GraduationCap className="w-14 h-14 text-white" />,
    smallIcon: <GraduationCap className="w-4 h-4" />,
    features: ['View Class Timetable', 'Check Attendance Records', 'Exam Schedules & Results', 'School Notices & Updates', 'AI Tutor Assistant'],
  },
};

function FieldInput({ id, label, type = 'text', value, onChange, onBlur, error, ringColor, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <div className="relative">
        <input
          id={id} name={id} type={type} value={value} onChange={onChange} onBlur={onBlur} autoComplete={id}
          className={[
            'w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 text-sm',
            'outline-none focus:ring-2 transition-colors',
            ringColor,
            error ? 'border-red-500' : '',
          ].join(' ')}
        />
        {children}
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

export default function Login() {
  const { login } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const { role } = useParams();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);
  const [rememberMe, setRememberMe] = React.useState(false);
  const [oauthLoading, setOauthLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [forgotOpen, setForgotOpen] = React.useState(false);
  const [forgotEmail, setForgotEmail] = React.useState('');
  const [forgotLoading, setForgotLoading] = React.useState(false);
  const [forgotMsg, setForgotMsg] = React.useState('');
  const [forgotErr, setForgotErr] = React.useState('');

  const formik = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema: loginSchema,
    onSubmit: async (values) => {
      if (!role || !roleConfig[role]) { navigate('/select-role'); return; }
      setLoading(true); setError(null);
      const urls = { student: `${baseApi}/student/login`, teacher: `${baseApi}/teacher/login`, school: `${baseApi}/school/login` };
      try {
        const response = await axios.post(urls[role], { email: values.email, password: values.password });
        if (rememberMe) {
          localStorage.setItem(`rememberedEmail_${role}`, values.email);
          localStorage.setItem(`rememberedPassword_${role}`, values.password);
          localStorage.setItem(`rememberMe_${role}`, 'true');
        } else {
          ['Email', 'Password', 'Me'].forEach(k => localStorage.removeItem(`remembered${k}_${role}`));
          localStorage.removeItem(`rememberMe_${role}`);
        }
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          if (response.data.user) {
            localStorage.setItem('user', JSON.stringify(response.data.user));
            login({ token: response.data.token, user: response.data.user });
          }
        }
        setSuccess('Login successful!');
        setTimeout(() => navigate(`/${role}`), 1000);
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid email or password');
      } finally { setLoading(false); }
    },
  });

  React.useEffect(() => { if (!role || !roleConfig[role]) navigate('/select-role'); }, [role, navigate]);

  React.useEffect(() => {
    if (role && roleConfig[role]) {
      const email = localStorage.getItem(`rememberedEmail_${role}`);
      const pwd = localStorage.getItem(`rememberedPassword_${role}`);
      if (localStorage.getItem(`rememberMe_${role}`) === 'true' && email) {
        formik.setFieldValue('email', email);
        if (pwd) formik.setFieldValue('password', pwd);
        setRememberMe(true);
      }
    }
  }, [role]);

  const handleForgotPassword = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!forgotEmail) { setForgotErr('Please enter your email address'); return; }
    if (!emailRegex.test(forgotEmail)) { setForgotErr('Please enter a valid email address'); return; }
    setForgotLoading(true); setForgotMsg(''); setForgotErr('');
    try {
      const response = await axios.post(`${baseApi}/school/forgot-password`, { email: forgotEmail.trim() }, { timeout: 10000 });
      setForgotMsg(response.data.message || 'Password reset link sent to your email');
      setTimeout(() => { setForgotEmail(''); setForgotOpen(false); setForgotMsg(''); setForgotErr(''); }, 4000);
    } catch (err) {
      setForgotErr(err.response?.data?.message || err.request ? 'Network error. Please check your connection.' : 'Failed to send reset email. Please try again.');
    } finally { setForgotLoading(false); }
  };

  const handleGoogleLogin = async (e) => {
    e.preventDefault();
    if (role !== 'school') { setError('OAuth login is currently only available for School Admin accounts'); return; }
    setOauthLoading(true); setError(null);
    try {
      if (!window.google?.accounts) { setError('Google login is not available. Please use email/password login.'); setOauthLoading(false); return; }
      window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        callback: async (response) => {
          try {
            if (!response.access_token) return;
            const userInfo = await axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${response.access_token}`);
            const loginRes = await axios.post(`${baseApi}/school/login/oauth`, { email: userInfo.data.email, provider: 'google' });
            if (loginRes.data.token) {
              localStorage.setItem('token', loginRes.data.token);
              localStorage.setItem('user', JSON.stringify(loginRes.data.user));
              login({ token: loginRes.data.token, user: loginRes.data.user });
              setSuccess('Google login successful!');
              setTimeout(() => navigate('/school'), 1000);
            }
          } catch (err) {
            if (err.response?.status === 404) {
              setError('No account found with this Google email. Please register first.');
            } else {
              setError('Google login failed. Please try again.');
            }
          } finally { setOauthLoading(false); }
        },
      }).requestAccessToken();
    } catch { setError('Google login initialization failed'); setOauthLoading(false); }
  };

  React.useEffect(() => {
    if (!window.google) {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true;
      document.head.appendChild(s);
    }
  }, []);

  if (!role || !roleConfig[role]) return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="text-white">Redirecting...</div></div>;

  const cr = roleConfig[role];

  return (
    <div className="h-screen overflow-hidden bg-gray-900 flex flex-col">
      {(error || success) && (
        <div className={`flex-shrink-0 px-5 py-2.5 flex items-center gap-3 text-sm font-medium ${error ? 'bg-red-900/40 text-red-300 border-b border-red-800' : 'bg-green-900/40 text-green-300 border-b border-green-800'}`}>
          <span>{error || success}</span>
          <button onClick={() => { setError(null); setSuccess(null); }} className="ml-auto text-lg opacity-60 hover:opacity-100 bg-transparent border-none cursor-pointer">&times;</button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Left branding */}
        <div className={`hidden lg:flex flex-col justify-between p-10 w-[44%] flex-shrink-0 ${cr.gradient} text-white`}>
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/bell.svg" alt="BeaconPort" className="w-9 h-9 brightness-0 invert" />
            <span className="text-2xl font-bold tracking-wide">BeaconPort</span>
          </div>
          <div>
            <div className="flex items-center gap-4 mb-5">{cr.bigIcon}<div><h1 className="text-5xl font-bold leading-tight">{cr.title}</h1><p className="text-lg opacity-90 mt-1">{cr.description}</p></div></div>
            <p className="text-base opacity-80 mb-8 leading-relaxed">{cr.tagline}</p>
            <ul className="space-y-3">
              {cr.features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-base">
                  <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center flex-shrink-0"><div className="w-2 h-2 rounded-full bg-white" /></div>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-6 text-sm opacity-60">
            <span className="cursor-pointer hover:opacity-100">Privacy Policy</span>
            <span className="cursor-pointer hover:opacity-100">Terms of Service</span>
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-900">
          <div className="flex-1 overflow-y-auto">
            <div className="min-h-full flex items-center justify-center p-6 lg:p-10">
              <div className="w-full max-w-md">
                <div className="lg:hidden flex items-center gap-2 mb-6 cursor-pointer" onClick={() => navigate('/')}>
                  <img src="/bell.svg" alt="BeaconPort" className={`w-8 h-8 ${cr.mobileLogoFilter}`} />
                  <span className={`text-xl font-bold ${cr.accentText}`}>BeaconPort</span>
                </div>
                <div className="mb-8">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-4 ${cr.badgeBg} ${cr.badgeText}`}>{cr.smallIcon} {cr.title}</div>
                  <h2 className="text-3xl font-bold text-white">Welcome back</h2>
                  <p className="text-gray-400 mt-1">Sign in to your {cr.title.toLowerCase()} account</p>
                </div>

                <form onSubmit={formik.handleSubmit} noValidate className="space-y-5">
                  <FieldInput id="email" label="Email address" type="email"
                    value={formik.values.email} onChange={formik.handleChange} onBlur={formik.handleBlur}
                    error={formik.touched.email && formik.errors.email} ringColor={cr.ringColor} />

                  <FieldInput id="password" label="Password" type={showPassword ? 'text' : 'password'}
                    value={formik.values.password} onChange={formik.handleChange} onBlur={formik.handleBlur}
                    error={formik.touched.password && formik.errors.password} ringColor={cr.ringColor}>
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </FieldInput>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} className="h-4 w-4 rounded accent-orange-500" />
                      <span className="text-sm text-gray-300">Remember me</span>
                    </label>
                    {role === 'school' && (
                      <button type="button" onClick={() => { setForgotEmail(formik.values.email || ''); setForgotMsg(''); setForgotErr(''); setForgotOpen(true); }}
                        className={`text-sm font-medium ${cr.accentText} hover:underline bg-transparent border-none cursor-pointer`}>
                        Forgot password?
                      </button>
                    )}
                  </div>

                  <button type="submit" disabled={loading || oauthLoading}
                    className={`w-full py-3 px-4 rounded-xl text-white font-semibold text-base transition-all shadow-md ${cr.btnGradient} disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2`}>
                    {loading ? <><Spinner size="sm" color="white" /> Signing in...</> : `Sign in as ${cr.title}`}
                  </button>

                  {role === 'school' && (
                    <>
                      <div className="flex items-center gap-3"><div className="flex-1 h-px bg-gray-700" /><span className="text-xs text-gray-500">OR CONTINUE WITH</span><div className="flex-1 h-px bg-gray-700" /></div>
                      <button type="button" onClick={handleGoogleLogin} disabled={loading || oauthLoading}
                        className="w-full h-11 inline-flex justify-center items-center gap-2.5 border border-gray-700 rounded-xl bg-gray-800 text-sm font-medium text-gray-200 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                        {oauthLoading ? <Spinner size="sm" color="gray" /> : (
                          <>
                            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Continue with Google
                          </>
                        )}
                      </button>
                    </>
                  )}

                  {role === 'school' && (
                    <p className="text-sm text-center text-gray-400">
                      Don&apos;t have an account?{' '}
                      <span onClick={() => navigate('/register')} className={`font-medium cursor-pointer hover:underline ${cr.accentText}`}>Create one</span>
                    </p>
                  )}

                  <p className="text-xs text-center text-gray-500">
                    Wrong portal?{' '}
                    <span onClick={() => navigate('/select-role')} className="underline cursor-pointer hover:text-gray-300">Switch role</span>
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot password modal */}
      <Modal open={forgotOpen} onClose={() => setForgotOpen(false)} title="Reset Your Password" size="sm"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <button onClick={() => setForgotOpen(false)} disabled={forgotLoading}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-600 rounded-lg transition-colors disabled:opacity-50">Cancel</button>
            <button onClick={handleForgotPassword} disabled={forgotLoading}
              className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-lg flex items-center gap-2 disabled:opacity-50">
              {forgotLoading ? <><Spinner size="xs" color="white" /> Sending...</> : 'Send Reset Link'}
            </button>
          </div>
        }
      >
        <p className="text-sm text-gray-400 mb-4">Enter your email and we&apos;ll send you a link to reset your password.</p>
        <input
          type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} autoFocus
          placeholder="Email address"
          className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-colors"
        />
        {forgotMsg && <div className="mt-3 text-sm text-green-400 bg-green-900/20 border border-green-700/40 rounded-lg px-3 py-2">{forgotMsg}</div>}
        {forgotErr && <div className="mt-3 text-sm text-red-400 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2">{forgotErr}</div>}
      </Modal>
    </div>
  );
}
