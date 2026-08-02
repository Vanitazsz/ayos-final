import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../../context/AuthContext';
import { loadSystemStatus, requestPasswordReset } from '../../../services/auth';

const messageFrom = (error) =>
  error instanceof Error ? error.message : 'The request could not be completed.';

export function useLoginController() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewState, setViewState] = useState('login');
  const [systemStatus, setSystemStatus] = useState('Checking');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/admin/dashboard';

  useEffect(() => {
    const controller = new AbortController();
    void loadSystemStatus(controller.signal)
      .then(setSystemStatus)
      .catch((loadError) => {
        if (loadError?.name !== 'AbortError') setSystemStatus('Unavailable');
      });
    return () => controller.abort();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (loginError) {
      setError(messageFrom(loginError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await requestPasswordReset(email);
      setSuccessMsg('If an account exists, a reset link has been sent to your email.');
    } catch (resetError) {
      setError(messageFrom(resetError));
    } finally {
      setIsLoading(false);
    }
  };

  const showLogin = () => {
    setViewState('login');
    setError('');
    setSuccessMsg('');
  };

  const showPasswordReset = () => {
    setViewState('forgot_password');
    setError('');
    setSuccessMsg('');
  };

  return {
    email,
    error,
    handleResetPassword,
    handleSubmit,
    isLoading,
    password,
    setEmail,
    setPassword,
    setShowPassword,
    showLogin,
    showPassword,
    showPasswordReset,
    successMsg,
    systemStatus,
    viewState,
  };
}
