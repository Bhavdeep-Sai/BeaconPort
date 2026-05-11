import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import { Spinner } from '../../../components/ui';

const Logout = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [status, setStatus] = useState('logging_out');

  useEffect(() => {
    const performLogout = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        logout();
        setStatus('success');
        setTimeout(() => navigate('/login', { replace: true }), 500);
      } catch {
        setStatus('error');
        setTimeout(() => navigate('/login', { replace: true }), 2000);
      }
    };
    performLogout();
  }, [logout, navigate]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 text-center min-w-[280px] shadow-xl">
        {status === 'logging_out' && (
          <>
            <Spinner size="lg" color="orange" className="mx-auto mb-4" />
            <p className="text-white font-semibold">Logging out...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-green-400 text-4xl mb-3">&#10003;</div>
            <p className="text-green-400 font-semibold">Logged out successfully</p>
            <p className="text-gray-500 text-sm mt-1">Redirecting...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-yellow-400 text-4xl mb-3">&#9888;</div>
            <p className="text-yellow-400 font-semibold">Logout completed</p>
            <p className="text-gray-500 text-sm mt-1">Redirecting...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default Logout;
