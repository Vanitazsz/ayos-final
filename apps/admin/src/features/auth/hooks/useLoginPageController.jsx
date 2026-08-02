import { useLoginController } from '../hooks/useLoginController';

export function useLoginPageController() {
  const {
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
  } = useLoginController();
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
