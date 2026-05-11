import * as React from 'react';
import axios from 'axios';
import { useFormik } from 'formik';
import { registerSchema } from '../../../yupSchema/registerSchema';
import { Eye, EyeOff, Upload, X, School, Users, BarChart2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import { baseApi } from '../../../environment';
import { Spinner } from '../../../components/ui';

const features = [
  { Icon: School,    text: 'Manage classes, schedules & subjects' },
  { Icon: Users,     text: 'Track students & teacher performance' },
  { Icon: BarChart2, text: 'Real-time attendance & exam analytics' },
];

function FieldInput({ id, label, type = 'text', value, onChange, onBlur, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <div className="relative">
        <input id={id} name={id} type={type} value={value} onChange={onChange} onBlur={onBlur}
          className={['w-full px-3 py-2.5 rounded-xl bg-gray-800/60 border text-gray-100 text-sm outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-colors', error ? 'border-red-500' : 'border-gray-700'].join(' ')} />
        {children}
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

function ImageUploadZone({ imageUrl, file, onClick, onRemove }) {
  return (
    <div onClick={onClick}
      className={['rounded-xl border-2 border-dashed flex items-center gap-4 px-5 py-4 cursor-pointer transition-all hover:border-orange-500/40', file ? 'border-orange-500 bg-orange-500/5' : 'border-gray-700 bg-gray-800/30'].join(' ')}>
      {imageUrl ? (
        <><img src={imageUrl} alt="preview" className="w-14 h-14 rounded-lg object-cover border border-gray-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">{file?.name}</p>
            <p className="text-xs text-gray-500">{file ? (file.size / 1024).toFixed(1) + ' KB' : ''}</p>
          </div>
          <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-300 flex-shrink-0"><X size={18} /></button>
        </>
      ) : (
        <><div className="w-12 h-12 rounded-xl bg-gray-700/60 flex items-center justify-center flex-shrink-0"><Upload size={20} className="text-gray-400" /></div>
          <div><p className="text-sm font-medium text-gray-300">Upload school image</p><p className="text-xs text-gray-500 mt-0.5">JPEG, PNG, WebP &mdash; max 10MB</p></div>
        </>
      )}
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const { login } = React.useContext(AuthContext);
  const [file, setFile] = React.useState(null);
  const [imageUrl, setImageUrl] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [oauthLoading, setOauthLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [oauthData, setOauthData] = React.useState(null);
  const [showOauthForm, setShowOauthForm] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const hiddenFileInputRef = React.useRef(null);
  const oauthFileInputRef = React.useRef(null);

  const isValidImageFile = (f) => {
    if (!['image/jpeg','image/png','image/gif','image/webp'].includes(f.type)) { setError('Please upload a valid image (JPEG, PNG, GIF, or WebP)'); return false; }
    if (f.size > 10 * 1024 * 1024) { setError('Image size must be less than 10MB'); return false; }
    return true;
  };

  const addImage = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    if (isValidImageFile(selected)) { setImageUrl(URL.createObjectURL(selected)); setFile(selected); setError(null); }
    else e.target.value = '';
  };

  const handleClearFile = () => {
    [hiddenFileInputRef, oauthFileInputRef].forEach(r => { if (r.current) r.current.value = ''; });
    setFile(null); setImageUrl(null);
  };

  React.useEffect(() => {
    if (!error && !success) return;
    const t = setTimeout(() => { setError(null); setSuccess(null); }, 6000);
    return () => clearTimeout(t);
  }, [error, success]);

  React.useEffect(() => {
    if (window.google) return;
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true;
    document.head.appendChild(s);
  }, []);

  const handleGoogleRegister = async () => {
    setOauthLoading(true); setError(null);
    try {
      if (typeof window.google === 'undefined') throw new Error('Google OAuth not loaded. Please refresh.');
      window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: 'email profile',
        callback: async (response) => {
          try {
            if (!response.access_token) throw new Error('No access token received');
            const res = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${response.access_token}`);
            const info = await res.json();
            setOauthData({ token: response.access_token, email: info.email, name: info.name });
            setShowOauthForm(true);
          } catch (err) { setError('Google authentication failed: ' + err.message); }
          finally { setOauthLoading(false); }
        },
        error_callback: () => { setError('Google authentication failed'); setOauthLoading(false); },
      }).requestAccessToken();
    } catch (err) { setError('Google OAuth failed: ' + err.message); setOauthLoading(false); }
  };

  const oauthFormik = useFormik({
    initialValues: { schoolName: '', ownerName: '' },
    onSubmit: async (values) => {
      if (!oauthData) return;
      setLoading(true); setError(null);
      try {
        if (!termsAccepted) { setError('Please accept the Terms and Conditions'); return; }
        if (!file) { setError('School image is required'); return; }
        const fd = new FormData();
        fd.append('image', file); fd.append('token', oauthData.token);
        fd.append('schoolName', values.schoolName.trim()); fd.append('ownerName', values.ownerName.trim());
        const res = await axios.post(`${baseApi}/school/register/google`, fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
        if (res?.data?.success) {
          setSuccess('Registered with Google! Redirecting...');
          login({ token: res.data.token, user: res.data.user });
          oauthFormik.resetForm(); setOauthData(null); setShowOauthForm(false); setTermsAccepted(false); handleClearFile();
          setTimeout(() => navigate('/school/dashboard'), 1500);
        }
      } catch (err) { setError(err.response?.data?.message || 'Registration failed. Please try again.'); }
      finally { setLoading(false); }
    },
  });

  const formik = useFormik({
    initialValues: { schoolName: '', email: '', ownerName: '', password: '', confirmPassword: '' },
    validationSchema: registerSchema,
    onSubmit: async (values) => {
      setLoading(true); setError(null); setSuccess(null);
      try {
        if (!file) { setError('School image is required'); return; }
        if (!termsAccepted) { setError('Please accept the Terms and Conditions'); return; }
        const fd = new FormData();
        fd.append('image', file); fd.append('schoolName', values.schoolName.trim());
        fd.append('email', values.email.trim().toLowerCase()); fd.append('ownerName', values.ownerName.trim());
        fd.append('password', values.password);
        const res = await axios.post(`${baseApi}/school/register`, fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
        if (res?.data?.success) {
          setSuccess('School registered! Redirecting...');
          login({ token: res.data.token, user: res.data.user });
          formik.resetForm(); handleClearFile(); setTermsAccepted(false);
          setTimeout(() => navigate('/school/dashboard'), 1500);
        }
      } catch (err) { setError(err.response?.data?.message || 'Registration failed. Please try again.'); }
      finally { setLoading(false); }
    },
  });

  return (
    <div className="min-h-screen flex overflow-hidden bg-gray-950">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 h-screen p-10 bg-gray-900 border-r border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <img src="/bell.svg" alt="BeaconPort" className="w-5 h-5 brightness-0 invert" />
          </div>
          <span className="text-white font-bold text-xl">BeaconPort</span>
        </div>
        <div className="space-y-8">
          <div>
            <h1 className="text-5xl font-bold text-white leading-tight">Power your<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">institution</span></h1>
            <p className="mt-4 text-gray-500 text-base leading-relaxed">A complete school management platform for administrators, teachers, and students.</p>
          </div>
          <div className="space-y-5">
            {features.map(({ Icon, text }, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0"><Icon size={18} className="text-orange-400" /></div>
                <span className="text-gray-400 text-base">{text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-600">Already have an account?{' '}
          <span onClick={() => navigate('/login')} className="text-yellow-400 cursor-pointer hover:text-yellow-300 font-medium">Sign in &rarr;</span>
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {(error || success) && (
          <div className={`flex-shrink-0 px-5 py-2.5 flex items-center gap-3 text-xs font-medium ${error ? 'bg-red-900/30 text-red-300 border-b border-red-800' : 'bg-green-900/30 text-green-300 border-b border-green-800'}`}>
            <span className="flex-1 truncate">{error || success}</span>
            <button onClick={() => { setError(null); setSuccess(null); }} className="opacity-60 hover:opacity-100 bg-transparent border-none cursor-pointer text-lg leading-none">&times;</button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto flex items-center justify-center px-6 lg:px-10 py-8">
          <div className="w-full max-w-[560px]">
            <div className="lg:hidden flex items-center gap-2 mb-6 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <img src="/bell.svg" alt="BeaconPort" className="w-4 h-4 brightness-0 invert" />
              </div>
              <span className="text-white font-bold text-lg">BeaconPort</span>
            </div>

            <div className="mb-7">
              <h2 className="text-3xl font-bold text-white">{showOauthForm ? 'Complete your profile' : 'Create your account'}</h2>
              <p className="text-gray-500 text-sm mt-1">{showOauthForm ? `Finishing registration for ${oauthData?.email}` : 'Register your institution on BeaconPort'}</p>
            </div>

            <form onSubmit={showOauthForm ? oauthFormik.handleSubmit : formik.handleSubmit} noValidate>
              {showOauthForm ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <FieldInput id="schoolName" label="Institute Name" value={oauthFormik.values.schoolName} onChange={oauthFormik.handleChange} onBlur={oauthFormik.handleBlur} />
                    <FieldInput id="ownerName" label="Owner Name" value={oauthFormik.values.ownerName} onChange={oauthFormik.handleChange} onBlur={oauthFormik.handleBlur} />
                  </div>
                  <input type="file" ref={oauthFileInputRef} onChange={addImage} accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" />
                  <ImageUploadZone imageUrl={imageUrl} file={file} onClick={() => oauthFileInputRef.current?.click()} onRemove={(e) => { e.stopPropagation(); handleClearFile(); }} />
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 rounded accent-orange-500 flex-shrink-0" />
                    <span className="text-sm text-gray-400">I agree to the <span className="text-orange-400 hover:underline cursor-pointer">Terms of Service</span> and <span className="text-orange-400 hover:underline cursor-pointer">Privacy Policy</span></span>
                  </label>
                  <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                    {loading ? <><Spinner size="sm" color="white" /> Registering...</> : 'Complete Registration'}
                  </button>
                  <button type="button" onClick={() => { setShowOauthForm(false); setOauthData(null); handleClearFile(); setTermsAccepted(false); }}
                    className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 bg-transparent border-none cursor-pointer text-center">
                    &larr; Back to registration
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <FieldInput id="schoolName" label="Institute Name" value={formik.values.schoolName} onChange={formik.handleChange} onBlur={formik.handleBlur} error={formik.touched.schoolName && formik.errors.schoolName} />
                    <FieldInput id="ownerName" label="Owner Name" value={formik.values.ownerName} onChange={formik.handleChange} onBlur={formik.handleBlur} error={formik.touched.ownerName && formik.errors.ownerName} />
                  </div>
                  <FieldInput id="email" label="Email address" type="email" value={formik.values.email} onChange={formik.handleChange} onBlur={formik.handleBlur} error={formik.touched.email && formik.errors.email} />
                  <div className="grid grid-cols-2 gap-4">
                    <FieldInput id="password" label="Password" type={showPassword ? 'text' : 'password'} value={formik.values.password} onChange={formik.handleChange} onBlur={formik.handleBlur} error={formik.touched.password && formik.errors.password}>
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </FieldInput>
                    <FieldInput id="confirmPassword" label="Confirm Password" type={showConfirmPassword ? 'text' : 'password'} value={formik.values.confirmPassword} onChange={formik.handleChange} onBlur={formik.handleBlur} error={formik.touched.confirmPassword && formik.errors.confirmPassword}>
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </FieldInput>
                  </div>
                  <input type="file" ref={hiddenFileInputRef} onChange={addImage} accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" />
                  <ImageUploadZone imageUrl={imageUrl} file={file} onClick={() => hiddenFileInputRef.current?.click()} onRemove={(e) => { e.stopPropagation(); handleClearFile(); }} />
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 rounded accent-orange-500 flex-shrink-0" />
                    <span className="text-sm text-gray-400">I agree to the <span className="text-orange-400 hover:underline cursor-pointer">Terms of Service</span> and <span className="text-orange-400 hover:underline cursor-pointer">Privacy Policy</span></span>
                  </label>
                  <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                    {loading ? <><Spinner size="sm" color="white" /> Creating account...</> : 'Create Account'}
                  </button>
                  <div className="flex items-center gap-3"><div className="flex-1 h-px bg-gray-800" /><span className="text-sm text-gray-600">or</span><div className="flex-1 h-px bg-gray-800" /></div>
                  <button type="button" onClick={handleGoogleRegister} disabled={oauthLoading}
                    className="w-full h-11 inline-flex justify-center items-center gap-2.5 border border-gray-700 rounded-xl bg-gray-800 text-sm font-medium text-gray-200 hover:bg-gray-700 transition-colors disabled:opacity-50">
                    {oauthLoading ? <Spinner size="sm" color="gray" /> : (
                      <><svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>Continue with Google</>
                    )}
                  </button>
                  <p className="text-center text-sm text-gray-500">Already have an account?{' '}
                    <span onClick={() => navigate('/login')} className="text-yellow-400 cursor-pointer hover:text-yellow-300 font-medium">Sign in</span>
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
