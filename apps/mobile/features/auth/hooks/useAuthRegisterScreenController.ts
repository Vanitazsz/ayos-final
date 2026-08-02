import { signUpCustomer } from '../logic/AuthRegisterScreenLogic';
import { useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { isValidPhilippinePhone } from '@/lib/workerRegistration';
type RoleChoice = 'USER' | 'WORKER' | null;
export function useAuthRegisterScreenController() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleChoice>(
    role === 'USER' ? 'USER' : null,
  );
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      mobile: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });
  const password = watch('password');
  const onSubmit = async (data: any) => {
    if (!acceptedTerms) {
      alert('Please accept the terms and conditions.');
      return;
    }

    setLoading(true);
    try {
      await signUpCustomer(data);
      router.push({ pathname: '/(auth)/otp', params: { email: data.email } });
    } catch (error) {
      Alert.alert(
        'Registration failed',
        error instanceof Error ? error.message : 'Unable to register',
      );
    } finally {
      setLoading(false);
    }
  };
  const handleRoleSelect = (role: RoleChoice) => {
    if (role === 'WORKER') {
      router.push('/register-worker');
      return;
    }
    setSelectedRole(role);
  };
  return {
    router,
    loading,
    acceptedTerms,
    setAcceptedTerms,
    selectedRole,
    setSelectedRole,
    control,
    handleSubmit,
    errors,
    password,
    onSubmit,
    handleRoleSelect,
    Controller,
    isValidPhilippinePhone,
  };
}
