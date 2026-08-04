import {
  fetchIndustriesAndSkills,
  submitWorkerApplication,
  MAX_SELECTED_SKILLS,
  formatBirthdayInput,
  validateWorkerStep1,
  validateWorkerStep2,
  validateWorkerStep3,
} from '../logic/RegisterWorkerScreenLogic';
import { useState, useEffect, useCallback } from 'react';
import { Keyboard } from 'react-native';
import { router } from 'expo-router';
import type { SelectOption } from '@/components/AppSelect';
const GENDERS: SelectOption[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Prefer not to say', value: 'other' },
];

const ID_TYPES: SelectOption[] = [
  { label: 'National ID (PhilSys)', value: 'philsys' },
  { label: "Driver's License", value: 'drivers_license' },
  { label: 'Passport', value: 'passport' },
  { label: 'UMID', value: 'umid' },
  { label: 'Postal ID', value: 'postal' },
  { label: 'PRC ID', value: 'prc' },
  { label: "Voter's ID", value: 'voters' },
  { label: 'Senior Citizen ID', value: 'senior' },
  { label: 'Other Government-issued ID', value: 'other' },
];
export function useRegisterWorkerScreenController() {
  const [step, setStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [industry, setIndustry] = useState('');
  const [industryValue, setIndustryValue] = useState('');
  const [isEditingIndustry, setIsEditingIndustry] = useState(false);
  const [employmentType, setEmploymentType] = useState<
    'employed' | 'freelance' | ''
  >('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [street, setStreet] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [idType, setIdType] = useState('');
  const [frontId, setFrontId] = useState<string | null>(null);
  const [backId, setBackId] = useState<string | null>(null);
  const [infoAccurate, setInfoAccurate] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [keyboardUp, setKeyboardUp] = useState(false);
  const [industries, setIndustries] = useState<SelectOption[]>([]);
  const [skillsByIndustry, setSkillsByIndustry] = useState<
    Record<string, SelectOption[]>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [submissionStatus, setSubmissionStatus] = useState('');
  const [submissionError, setSubmissionError] = useState('');
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () =>
      setKeyboardUp(true),
    );
    const hideSub = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardUp(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  const loadIndustryCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError('');
    const result = await fetchIndustriesAndSkills();
    if (result.error) {
      setIndustries([]);
      setSkillsByIndustry({});
      setCatalogError(result.error);
    } else {
      setIndustries(
        result.data.map((row) => ({ label: row.name, value: row.id })),
      );
      setSkillsByIndustry(
        Object.fromEntries(
          result.data.map((row) => [
            row.id,
            row.skills.map((skill) => ({ label: skill.name, value: skill.id })),
          ]),
        ),
      );
      if (result.data.length === 0)
        setCatalogError('No active industries are available.');
    }
    setCatalogLoading(false);
  }, []);
  useEffect(() => {
    void loadIndustryCatalog();
  }, [loadIndustryCatalog]);
  const availableSkills = industryValue
    ? skillsByIndustry[industryValue] || []
    : [];
  const toggleSkill = (skillValue: string) => {
    if (!availableSkills.some((skill) => skill.value === skillValue)) return;
    setSelectedSkills((prev) => {
      if (prev.includes(skillValue)) {
        setErrors((current) => ({ ...current, skills: '' }));
        return prev.filter((value) => value !== skillValue);
      }
      if (prev.length >= MAX_SELECTED_SKILLS) {
        setErrors((current) => ({
          ...current,
          skills: 'Select up to 10 skills',
        }));
        return prev;
      }
      setErrors((current) => ({ ...current, skills: '' }));
      return [...prev, skillValue];
    });
  };
  const handleIndustryTextChange = (text: string) => {
    const selectedLabel = industries.find(
      (option) => option.value === industryValue,
    )?.label;
    setIndustry(text);
    if (!selectedLabel || text !== selectedLabel) {
      setIndustryValue('');
      setSelectedSkills([]);
      setSkillInput('');
    }
  };
  const handleBirthdayChange = (text: string) => {
    setBirthday(formatBirthdayInput(text));
  };
  const validateStep1 = () => {
    const e = validateWorkerStep1({
      firstName,
      lastName,
      email,
      phone,
      birthday,
      password,
      confirmPassword,
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const validateStep2 = () => {
    const e = validateWorkerStep2({
      industryValue,
      industries,
      employmentType,
      selectedSkills,
      availableSkills,
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const validateStep3 = () => {
    const e = validateWorkerStep3({
      street,
      city,
      region,
      contactPerson,
      contactPhone,
      idType,
      frontId,
      backId,
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
      setErrors({});
    } else if (step === 2 && validateStep2()) {
      setStep(3);
      setErrors({});
    } else if (step === 3 && validateStep3()) {
      setStep(4);
      setErrors({});
    }
  };
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setErrors({});
    } else {
      router.back();
    }
  };
  const handleSubmit = async () => {
    if (submitting) return;
    if (!infoAccurate || !agreePrivacy || !agreeTerms) {
      setErrors({ consent: 'Please agree to all required consents' });
      return;
    }
    setErrors({});
    setSubmissionError('');
    setSubmissionStatus('Preparing your worker registration…');
    setSubmitting(true);
    try {
      const result = await submitWorkerApplication(
        {
          email,
          password,
          displayName: [firstName, middleName, lastName]
            .filter(Boolean)
            .join(' '),
          bio: `${getIndustryLabel()} — ${employmentType}`,
          experience: getSkillLabels().join(', '),
          frontId: frontId!,
          backId: backId!,
          identityData: {
            firstName,
            middleName,
            lastName,
            phone,
            birthday,
            gender,
            industryId: industryValue,
            skillIds: selectedSkills,
            employmentType,
            address: {
              streetNumber,
              street,
              barangay: district,
              city,
              province: region,
              postalCode,
            },
            contactPerson,
            contactPhone,
            idType,
            consents: {
              informationAccurate: infoAccurate,
              privacy: agreePrivacy,
              terms: agreeTerms,
            },
          },
        },
        setSubmissionStatus,
      );
      if (result.requiresEmailVerification) {
        setSubmissionStatus('Enter the verification code sent to your email.');
        router.push({
          pathname: '/(auth)/otp',
          params: {
            email: email.trim().toLowerCase(),
            returnTo: 'worker-registration',
          },
        });
        return;
      }
      setSubmissionStatus('Worker verification submitted.');
      setShowSuccess(true);
    } catch (error) {
      setSubmissionStatus('');
      setSubmissionError(
        error instanceof Error
          ? error.message
          : 'Application was not submitted',
      );
    } finally {
      setSubmitting(false);
    }
  };
  const goToStep = (target: number) => {
    setStep(target);
    setErrors({});
  };
  const getIndustryLabel = () =>
    industries.find((i) => i.value === industryValue)?.label || '';
  const getSkillLabels = () =>
    selectedSkills.flatMap((sv) => {
      const skill = availableSkills.find((option) => option.value === sv);
      return skill ? [skill.label] : [];
    });
  const getIdTypeLabel = () =>
    ID_TYPES.find((i) => i.value === idType)?.label || '';
  const getGenderLabel = () =>
    GENDERS.find((g) => g.value === gender)?.label || 'Not specified';
  return {
    step,
    showSuccess,
    setShowSuccess,
    showPassword,
    setShowPassword,
    firstName,
    setFirstName,
    middleName,
    setMiddleName,
    lastName,
    setLastName,
    email,
    setEmail,
    phone,
    setPhone,
    birthday,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    gender,
    setGender,
    industry,
    setIndustry,
    industryValue,
    setIndustryValue,
    isEditingIndustry,
    setIsEditingIndustry,
    employmentType,
    setEmploymentType,
    selectedSkills,
    setSelectedSkills,
    skillInput,
    setSkillInput,
    availableSkills,
    streetNumber,
    setStreetNumber,
    street,
    setStreet,
    district,
    setDistrict,
    city,
    setCity,
    region,
    setRegion,
    postalCode,
    setPostalCode,
    contactPerson,
    setContactPerson,
    contactPhone,
    setContactPhone,
    idType,
    setIdType,
    frontId,
    setFrontId,
    backId,
    setBackId,
    infoAccurate,
    setInfoAccurate,
    agreePrivacy,
    setAgreePrivacy,
    agreeTerms,
    setAgreeTerms,
    errors,
    keyboardUp,
    submitting,
    industries,
    catalogLoading,
    catalogError,
    submissionStatus,
    submissionError,
    genders: GENDERS,
    idTypes: ID_TYPES,
    toggleSkill,
    handleIndustryTextChange,
    handleBirthdayChange,
    loadIndustryCatalog,
    goToStep,
    getIndustryLabel,
    getSkillLabels,
    getIdTypeLabel,
    getGenderLabel,
    handleNext,
    handleBack,
    handleSubmit,
    router,
  };
}
