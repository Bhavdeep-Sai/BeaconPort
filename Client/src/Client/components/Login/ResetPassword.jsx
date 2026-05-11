import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import { Spinner } from '../../../components/ui';
import { baseApi } from '../../../environment';

const resetSchema = Yup.object({
  newPassword: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must contain uppercase, lowercase, and a number')
    .required('New password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword')], 'Passwords must match')
    .required('Please confirm your password'),
});

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const formik = useFormik({
    initialValues: { newPassword: '', confirmPassword: '' },
    validationSchema: resetSchema,
    onSubmit: async (values) => {
      setLoading(true); setError(''); setSuccess('');
      try {
        const res = await axios.post(`${baseApi}/school/reset-password`, { token, newPassword: values.newPassword });
        if (res.data.success) {
          setSuccess('Password reset successfully! Redirecting to login...');
          setTimeout(() => navigate('/login/school'), 3000);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
      } finally { setLoading(false); }
    },
  });

  useEffect(() => {
    if (!token) { setError('Invalid reset token'); setVerifying(false); return; }
    axios.get(`${baseApi}/school/verify-reset-token/${token}`)
      .then(res => { if (res.data.success) { setTokenValid(true); setSchoolName(res.data.schoolName || ''); } })
      .catch(err => setError(err.response?.data?.message || 'Invalid or expired reset token'))
      .finally(() => setVerifying(false));
  }, [token]);

  if (verifying) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <Spinner size="lg" color="orange" className="mx-auto mb-3" />
        <p className="text-white font-semibold">Verifying reset token...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-2 mb-6 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/bell.svg" alt="BeaconPort" className="w-8 h-8 brightness-0 invert opacity-80" />
          <span className="text-lg font-bold text-white">BeaconPort</span>
        </div>

        {!tokenValid ? (
          <div className="text-center py-6">
            <div className="text-red-400 text-5xl mb-4">&#9888;</div>
            <h2 className="text-xl font-bold text-white mb-2">Invalid or Expired Link</h2>
            <p className="text-gray-400 text-sm mb-6">{error || 'This password reset link is no longer valid.'}</p>
            <button onClick={() => navigate('/login/school')} className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-red-600 transition-all">
              Back to Login
            </button>
          </div>
        ) : success ? (
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Password Reset!</h2>
            <p className="text-gray-400 text-sm">{success}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center">
                <Lock size={20} className="text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Reset Password</h2>
                {schoolName && <p className="text-sm text-gray-400">{schoolName}</p>}
              </div>
            </div>

            {error && <div className="mb-4 text-sm text-red-400 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2">{error}</div>}

            <form onSubmit={formik.handleSubmit} className="space-y-4">
              {[
                { id: 'newPassword', label: 'New Password', show: showNew, toggle: () => setShowNew(!showNew) },
                { id: 'confirmPassword', label: 'Confirm Password', show: showConfirm, toggle: () => setShowConfirm(!showConfirm) },
              ].map(({ id, label, show, toggle }) => (
                <div key={id}>
                  <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
                  <div className="relative">
                    <input id={id} name={id} type={show ? 'text' : 'password'}
                      value={formik.values[id]} onChange={formik.handleChange} onBlur={formik.handleBlur}
                      className={['w-full px-3 py-2.5 pr-10 rounded-xl bg-gray-700 border text-gray-100 text-sm outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-colors', formik.touched[id] && formik.errors[id] ? 'border-red-500' : 'border-gray-600'].join(' ')} />
                    <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {formik.touched[id] && formik.errors[id] && <p className="text-xs text-red-400 mt-1">{formik.errors[id]}</p>}
                </div>
              ))}

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all mt-2">
                {loading ? <><Spinner size="sm" color="white" /> Resetting...</> : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
