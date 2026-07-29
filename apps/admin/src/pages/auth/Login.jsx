import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewState, setViewState] = useState('login'); // 'login' or 'forgot_password'
  const [systemStatus,setSystemStatus]=useState('Checking');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/admin/dashboard';
  useEffect(()=>{const controller=new AbortController();void fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/health`,{signal:controller.signal}).then(response=>setSystemStatus(response.ok?'Operational':'Unavailable')).catch(error=>{if(error.name!=='AbortError')setSystemStatus('Unavailable')});return()=>controller.abort();},[]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/login` });
      if (resetError) throw resetError;
      setSuccessMsg('If an account exists, a reset link has been sent to your email.');
    } catch (resetError) { setError(resetError.message); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex bg-background font-sans">
      {/* Left Side - Brand/Illustration */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-navy overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/20 to-navy opacity-50"></div>
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/30 blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-info/20 blur-3xl"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-between w-full p-12 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center font-display font-bold text-xl shadow-lg">
              A
            </div>
            <span className="font-display font-bold text-2xl tracking-tight">A-yos Admin</span>
          </div>

          <div className="max-w-md animate-fade-in-up">
            <h1 className="text-4xl font-display font-bold leading-tight mb-6">
              Manage the A-yos ecosystem securely.
            </h1>
            <p className="text-lg text-gray-300 leading-relaxed mb-8">
              One centralized platform to oversee users, workers, bookings, and payments with powerful analytics and controls.
            </p>
            <div className="flex items-center space-x-3 bg-white/10 px-4 py-3 rounded-lg backdrop-blur-sm border border-white/10 w-max">
              <ShieldCheck className="h-5 w-5 text-success" />
              <span className="text-sm font-medium">Enterprise-grade security</span>
            </div>
          </div>

          <div className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} A-yos Platform. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md bg-cards p-8 rounded-2xl shadow-xl border border-border animate-fade-in">
          <div className="lg:hidden flex items-center justify-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center font-display font-bold text-xl text-white shadow-lg">
              A
            </div>
            <span className="font-display font-bold text-2xl tracking-tight text-navy">A-yos Admin</span>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-navy mb-2">
              {viewState === 'login' ? 'Welcome Back' : 'Reset Password'}
            </h2>
            <p className="text-gray-500">
              {viewState === 'login' 
                ? 'Please sign in to your administrator account.' 
                : 'Enter your email address and we will send you a link to reset your password.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-danger/10 border-l-4 border-danger p-4 rounded-r-lg flex items-start">
              <div className="flex-1 text-sm text-danger font-medium">{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 bg-success/10 border-l-4 border-success p-4 rounded-r-lg flex items-start">
              <div className="flex-1 text-sm text-success font-medium">{successMsg}</div>
            </div>
          )}

          {viewState === 'login' ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Email Address"
                type="email"
                placeholder="Administrator email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={Mail}
                required
              />

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={Lock}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center">
                  <input type="checkbox" className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary" />
                  <span className="ml-2 text-sm text-gray-600">Remember me</span>
                </label>
                <button 
                  type="button" 
                  onClick={() => { setViewState('forgot_password'); setError(''); setSuccessMsg(''); }}
                  className="text-sm font-medium text-primary hover:text-blue-700 transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" className="w-full mt-6" size="lg" isLoading={isLoading}>
                Sign In to Dashboard
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <Input
                label="Email Address"
                type="email"
                placeholder="Administrator email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={Mail}
                required
              />

              <Button type="submit" className="w-full mt-6" size="lg" isLoading={isLoading}>
                Send Reset Link
              </Button>

              <div className="text-center mt-4">
                <button 
                  type="button" 
                  onClick={() => { setViewState('login'); setError(''); setSuccessMsg(''); }}
                  className="text-sm font-medium text-gray-500 hover:text-navy transition-colors"
                >
                  &larr; Back to Login
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 space-y-2 sm:space-y-0">
            <div className="flex space-x-4">
              <a href="#" className="hover:text-navy transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-navy transition-colors">Terms of Service</a>
            </div>
            <div>System Status: <span className={`font-medium ${systemStatus==='Operational'?'text-success':systemStatus==='Unavailable'?'text-danger':'text-gray-500'}`}>{systemStatus}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
