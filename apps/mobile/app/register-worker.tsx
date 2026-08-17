import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Keyboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { Screen } from '@/components/layout/Screen';
import {
  ArrowLeft,
  ChevronRight,
  CircleCheck,
  Briefcase,
  Wrench,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
  Edit3,
  Building2,
  X,
  AlertCircle,
} from 'lucide-react-native';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import {
  InfoCard,
  InfoCardHighlight,
  infoCardStyles,
} from '@/components/InfoCard';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { AppSelect, SelectOption } from '@/components/AppSelect';
import { AppAutocomplete } from '@/components/AppAutocomplete';
import { Chip } from '@/components/Chip';
import { ImageUploadCard } from '@/components/ImageUploadCard';
import { LegalContentModal } from '@/components/LegalContentModal';
import { fetchIndustriesAndSkills } from '@/services/api';
import { submitWorkerApplication } from '@/services/workerApplication';
import { supabase } from '@/lib/supabase';
import { isValidPhilippinePhone } from '@/lib/workerRegistration';
import { getVerificationPendingNotice } from '@/lib/verificationStatus';
import { PasswordRequirements } from '@/components/PasswordRequirements';

import { AppDatePicker } from '@/components/AppDatePicker';

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

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function RegisterWorkerScreen() {
  const goBack = useGoBack('/(auth)/register');
  const { submitted, error, notice } = useLocalSearchParams<{
    submitted?: string;
    error?: string;
    notice?: string;
  }>();
  const verificationPendingNotice = getVerificationPendingNotice();
  const [step, setStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (submitted === 'true') {
      setShowSuccess(true);
    }
    if (error) {
      setSubmissionError(error);
      setStep(1);
    }
    if (notice) {
      setSubmissionStatus(notice);
    }
  }, [submitted, error, notice]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (event) =>
      setKeyboardHeight(event.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardHeight(0),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Step 1: Account for Ayos
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2: Industry & Skills
  const [industry, setIndustry] = useState('');
  const [industryValue, setIndustryValue] = useState('');
  const [isEditingIndustry, setIsEditingIndustry] = useState(false);
  const [employmentType, setEmploymentType] = useState<
    'employed' | 'freelance' | ''
  >('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Step 3: Identity Verification
  const [idType, setIdType] = useState('');
  const [frontId, setFrontId] = useState<string | null>(null);
  const [backId, setBackId] = useState<string | null>(null);

  // Consent
  const [infoAccurate, setInfoAccurate] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [legalModal, setLegalModal] = useState<'TERMS' | 'PRIVACY' | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [industries, setIndustries] = useState<SelectOption[]>([]);
  const [skillsByIndustry, setSkillsByIndustry] = useState<
    Record<string, SelectOption[]>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [submissionStatus, setSubmissionStatus] = useState('');
  const [submissionError, setSubmissionError] = useState('');

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
      if (prev.length >= 10) {
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
    }
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!firstName) e.firstName = 'First name is required';
    if (!lastName) e.lastName = 'Last name is required';
    if (!emailRegex.test(email)) e.email = 'Valid email address is required';
    if (!isValidPhilippinePhone(phone))
      e.phone = 'Valid PH mobile number required (e.g. 09171234567 or +639171234567)';
    if (!birthday) {
      e.birthday = 'Please select your date of birth';
    } else {
      const parts = birthday.split('/');
      if (parts.length !== 3) {
        e.birthday = 'Please select a valid date in MM/DD/YYYY format';
      } else {
        const month = parseInt(parts[0], 10) - 1;
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        const birthDate = new Date(year, month, day);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        if (isNaN(birthDate.getTime()) || month < 0 || month > 11 || day < 1 || day > 31) {
          e.birthday = 'Invalid date format. Use MM/DD/YYYY';
        } else if (age < 18) {
          e.birthday = 'You must be at least 18 years old to register as a worker';
        }
      }
    }
    if (!passwordRegex.test(password))
      e.password = 'Use 8+ characters with uppercase, number, and symbol';
    if (password !== confirmPassword)
      e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (
      !industryValue ||
      !industries.some((option) => option.value === industryValue)
    )
      e.industry = 'Please select a primary industry';
    if (!employmentType) e.employmentType = 'Please select employment type';
    if (selectedSkills.length === 0) e.skills = 'Select at least one skill';
    else if (selectedSkills.length > 10) e.skills = 'Select up to 10 skills';
    else if (
      selectedSkills.some(
        (value) => !availableSkills.some((skill) => skill.value === value),
      )
    )
      e.skills = 'Select skills from the chosen industry';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e: Record<string, string> = {};
    if (!idType) e.idType = 'Please select an ID type';
    if (!frontId) e.frontId = 'Front of ID is required';
    if (!backId) e.backId = 'Back of ID is required';
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
      goBack();
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
      const catalog = await fetchIndustriesAndSkills();
      if (catalog.error) {
        setSubmissionError(
          'Unable to refresh the service catalog. Check your connection and try again.',
        );
        return;
      }
      const freshIndustry = catalog.data.find(
        (row) => row.id === industryValue,
      );
      const freshSkillIds = new Set(freshIndustry?.skills.map((skill) => skill.id));
      const hasStaleSkill = selectedSkills.some((id) => !freshSkillIds.has(id));
      if (!freshIndustry || hasStaleSkill) {
        await loadIndustryCatalog();
        setSubmissionError(
          'Your industry or skills changed while filling this form. Review your selections in Industry & Skills and try again.',
        );
        setStep(2);
        return;
      }
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
            resumeToken: result.resumeToken,
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

  const stepLabels = ['Account', 'Industry', 'Identity', 'Review'];

  const renderStepper = () => (
    <View style={styles.progressContainer}>
      {[1, 2, 3, 4].map((item) => (
        <View key={item} style={styles.progressStep}>
          <View style={styles.stepDotsRow}>
            <View
              style={[
                styles.progressLine,
                item === 1 ? styles.progressLineHidden : null,
                step > item - 1 ? styles.progressLineActive : null,
              ]}
            />
            <View
              style={[
                styles.progressDot,
                step >= item ? styles.progressDotActive : null,
              ]}
            >
              {step > item ? (
                <CircleCheck size={16} color={Colors.white} />
              ) : (
                <AppText
                  variant="caption"
                  weight="bold"
                  color={step === item ? Colors.white : Colors.textTertiary}
                >
                  {item}
                </AppText>
              )}
            </View>
            <View
              style={[
                styles.progressLine,
                item === 4 ? styles.progressLineHidden : null,
                step > item ? styles.progressLineActive : null,
              ]}
            />
          </View>
          <AppText
            variant="caption"
            weight={step === item ? 'bold' : 'regular'}
            color={step === item ? Colors.primary : Colors.textTertiary}
            style={styles.stepLabel}
          >
            {stepLabels[item - 1]}
          </AppText>
        </View>
      ))}
    </View>
  );

  // ─── Step 1: Account for Ayos ───────────────────────────────────────────
  const renderStep1 = () => (
    <View style={styles.formSection}>
      <View style={styles.sectionHeader}>
        <User size={28} color={Colors.primary} />
        <AppText variant="h3" weight="bold" style={styles.sectionTitleNoMargin}>
          Account for Ayos
        </AppText>
      </View>
      <AppText
        variant="body"
        color={Colors.textSecondary}
      >
        Create your worker account credentials. This will be used to sign in.
      </AppText>

      {/* Instruction Banner */}
      <InfoCard title="Step 1 Instructions" style={styles.instructionCard}>
        Fill in your account information below (First &amp; Last Name, Email,
        Mobile Number starting with +63, Birthday, and Password). Unfilled or
        invalid fields will be <InfoCardHighlight>highlighted in red</InfoCardHighlight>.
      </InfoCard>

      <AppInput
        label="First Name"
        placeholder="Enter first name"
        value={firstName}
        onChangeText={setFirstName}
        error={errors.firstName}
        leftIcon={<User size={20} color={Colors.textSecondary} />}
        autoComplete="given-name"
        textContentType="givenName"
      />
      <AppInput
        label="Middle Name (Optional)"
        placeholder="Enter middle name"
        value={middleName}
        onChangeText={setMiddleName}
        leftIcon={<User size={20} color={Colors.textSecondary} />}
        autoComplete="given-name"
        textContentType="givenName"
      />
      <AppInput
        label="Last Name"
        placeholder="Enter last name"
        value={lastName}
        onChangeText={setLastName}
        error={errors.lastName}
        leftIcon={<User size={20} color={Colors.textSecondary} />}
        autoComplete="family-name"
        textContentType="familyName"
      />
      <AppInput
        label="Email Address"
        placeholder="Enter email address"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        leftIcon={<Mail size={20} color={Colors.textSecondary} />}
      />
      <AppInput
        label="Mobile Number"
        placeholder="e.g. 09171234567 or +639171234567"
        helperText="(11 digits starting with 09)"
        value={phone}
        onChangeText={setPhone}
        error={errors.phone}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        leftIcon={<Phone size={20} color={Colors.textSecondary} />}
      />
      <AppDatePicker
        label="Birthday (Date of Birth)"
        value={birthday}
        onChange={(dateStr) => setBirthday(dateStr)}
        error={errors.birthday}
        helperText="Must be at least 18 years old"
      />
      <AppSelect
        label="Gender (Optional)"
        options={GENDERS}
        value={gender}
        onSelect={setGender}
        placeholder="Select gender"
      />
      <AppInput
        label="Password"
        placeholder="Min. 8 chars, 1 Upper, 1 Number, 1 Special"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        leftIcon={<Lock size={20} color={Colors.textSecondary} />}
        rightIcon={
          showPassword ? (
            <EyeOff size={20} color={Colors.textTertiary} />
          ) : (
            <Eye size={20} color={Colors.textTertiary} />
          )
        }
        onRightIconPress={() => setShowPassword(!showPassword)}
        rightIconAccessibilityLabel={
          showPassword ? 'Hide password' : 'Show password'
        }
      />
      <AppInput
        label="Confirm Password"
        placeholder="Re-type password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={errors.confirmPassword}
        secureTextEntry={!showConfirmPassword}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        leftIcon={<Lock size={20} color={Colors.textSecondary} />}
        rightIcon={
          showConfirmPassword ? (
            <EyeOff size={20} color={Colors.textTertiary} />
          ) : (
            <Eye size={20} color={Colors.textTertiary} />
          )
        }
        onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
        rightIconAccessibilityLabel={
          showConfirmPassword ? 'Hide password' : 'Show password'
        }
      />
      <PasswordRequirements
        password={password}
        confirmation={confirmPassword}
        showMatch
      />
    </View>
  );

  // ─── Step 2: Industry & Skills ──────────────────────────────────────────
  const renderStep2 = () => (
    <View style={styles.formSection}>
      <View style={styles.sectionHeader}>
        <Briefcase size={28} color={Colors.primary} />
        <AppText variant="h3" weight="bold" style={styles.sectionTitleNoMargin}>
          Industry & Skills
        </AppText>
      </View>
      <AppText
        variant="body"
        color={Colors.textSecondary}
      >
        Select your primary industry and the services you offer.
      </AppText>

      {/* Instruction Banner */}
      <InfoCard title="Step 2 Instructions: Industry &amp; Skills" style={styles.instructionCard}>
        {'\u2022'} Select{' '}
        <Text style={styles.textBold}>1 Primary Industry</Text> from the
        catalog.{'\n'}
        {'\u2022'} Select your{' '}
        <Text style={styles.textBold}>Employment Type</Text> (Company or
        Freelance).{'\n'}
        {'\u2022'} Choose at least{' '}
        <Text style={styles.textBold}>1 skill</Text> (recommended 1–3 skills, up
        to 10 max).{'\n'}
        {'\u2022'} Incomplete selections will be{' '}
        <InfoCardHighlight>highlighted in red</InfoCardHighlight>.
      </InfoCard>

      <AppText variant="label" style={{ marginBottom: -Spacing['2'] }}>
        Primary Industry
      </AppText>
      {industryValue && !isEditingIndustry ? (
        <Pressable
          style={styles.industrySelectedCard}
          onPress={() => setIsEditingIndustry(true)}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing['3'],
              flex: 1,
            }}
          >
            <Briefcase size={20} color={Colors.white} />
            <AppText
              variant="body"
              weight="bold"
              color={Colors.white}
              style={{ flex: 1 }}
            >
              {industry}
            </AppText>
          </View>
          <Edit3 size={18} color={Colors.white} />
        </Pressable>
      ) : (
        <AppAutocomplete
          value={industry}
          onChangeText={handleIndustryTextChange}
          onSelect={(option) => {
            if (option.value !== industryValue) {
              setSelectedSkills([]);
            }
            setIndustry(option.label);
            setIndustryValue(option.value);
            setIsEditingIndustry(false);
          }}
          options={industries}
          placeholder="Type or select your industry"
          error={errors.industry}
          allowCustom={false}
          maxSuggestions={10}
        />
      )}
      {catalogLoading && (
        <AppText
          variant="caption"
          color={Colors.textSecondary}
        >
          Loading industries from the service catalog…
        </AppText>
      )}
      {!catalogLoading && catalogError && (
        <Pressable
          onPress={() => {
            void loadIndustryCatalog();
          }}
        >
          <AppText
            variant="caption"
            color={Colors.error}
          >
            {catalogError} Tap to retry.
          </AppText>
        </Pressable>
      )}

      <AppText variant="label" style={{ marginBottom: -Spacing['2'] }}>
        Employment Type
      </AppText>
      <View
        style={[
          {
            flexDirection: 'row',
            gap: Spacing['3'],
          },
          errors.employmentType ? styles.employmentContainerError : null,
        ]}
      >
        <Pressable
          style={[
            styles.employmentCard,
            employmentType === 'employed' && styles.employmentCardSelected,
          ]}
          onPress={() => setEmploymentType('employed')}
        >
          <Building2
            size={24}
            color={
              employmentType === 'employed' ? Colors.white : Colors.textTertiary
            }
          />
          <AppText
            variant="bodySm"
            weight={employmentType === 'employed' ? 'bold' : 'regular'}
            color={
              employmentType === 'employed'
                ? Colors.white
                : Colors.textSecondary
            }
          >
            Employed at a Company
          </AppText>
        </Pressable>
        <Pressable
          style={[
            styles.employmentCard,
            employmentType === 'freelance' && styles.employmentCardSelected,
          ]}
          onPress={() => setEmploymentType('freelance')}
        >
          <User
            size={24}
            color={
              employmentType === 'freelance'
                ? Colors.white
                : Colors.textTertiary
            }
          />
          <AppText
            variant="bodySm"
            weight={employmentType === 'freelance' ? 'bold' : 'regular'}
            color={
              employmentType === 'freelance'
                ? Colors.white
                : Colors.textSecondary
            }
          >
            Freelance / Independent
          </AppText>
        </Pressable>
      </View>
      {errors.employmentType && (
        <AppText
          variant="caption"
          color={Colors.error}
          weight="bold"
        >
          ⚠️ {errors.employmentType}
        </AppText>
      )}

      {industryValue ? (
        <>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: -Spacing['2'],
            }}
          >
            <AppText variant="label">Skills / Services</AppText>
            <AppText
              variant="caption"
              weight="bold"
              color={selectedSkills.length === 0 ? Colors.error : Colors.primary}
            >
              Selected: {selectedSkills.length} (Recommended: 1–3 skills)
            </AppText>
          </View>
          {catalogLoading && (
            <AppText variant="caption" color={Colors.textSecondary}>
              Loading available skills…
            </AppText>
          )}
          <View style={styles.chipGrid}>
            {availableSkills.map((skill) => {
              const isSelected = selectedSkills.includes(skill.value);
              return (
                <Chip
                  key={skill.value}
                  label={skill.label}
                  selected={isSelected}
                  onPress={() => toggleSkill(skill.value)}
                  rightIcon={
                    isSelected ? <X size={14} color={Colors.white} /> : undefined
                  }
                  size="sm"
                />
              );
            })}
          </View>
          {errors.skills ? (
            <AppText variant="caption" color={Colors.error} weight="bold">
              ⚠️ {errors.skills}
            </AppText>
          ) : null}
        </>
      ) : (
        <View style={styles.emptyState}>
          <Wrench size={32} color={Colors.textTertiary} />
          <AppText
            variant="body"
            color={Colors.textTertiary}
            style={{ marginTop: Spacing['2'] }}
          >
            Select an industry to see available skills
          </AppText>
        </View>
      )}
    </View>
  );

  // ─── Step 3: Identity Verification ────────────────────────────────────
  const renderStep3 = () => (
    <View style={styles.formSection}>
      <View style={styles.sectionHeader}>
        <ShieldCheck size={28} color={Colors.primary} />
        <AppText variant="h3" weight="bold" style={styles.sectionTitleNoMargin}>
          Identity Verification
        </AppText>
      </View>
      <AppText
        variant="body"
        color={Colors.textSecondary}
      >
        Upload a valid government ID to verify your identity.
      </AppText>

      {/* Instruction Banner */}
      <InfoCard title="Step 3 Instructions: Identity Verification" style={styles.instructionCard}>
        {'\u2022'} Select a valid Government ID and upload clear photos of both
        Front &amp; Back.{'\n'}
        {'\u2022'} Missing details or photo uploads will be{' '}
        <InfoCardHighlight>highlighted in red</InfoCardHighlight>.
      </InfoCard>

      <AppSelect
        label="Select Valid Government ID"
        options={ID_TYPES}
        value={idType}
        onSelect={setIdType}
        error={errors.idType}
      />
      <ImageUploadCard
        label="Upload Front of ID"
        onImageSelected={setFrontId}
        error={errors.frontId}
      />
      <ImageUploadCard
        label="Upload Back of ID"
        onImageSelected={setBackId}
        error={errors.backId}
      />

      <View style={styles.privacyNotice}>
        <ShieldCheck size={24} color={Colors.verified} />
        <AppText
          variant="caption"
          color={Colors.textSecondary}
          style={{ flex: 1 }}
        >
          Your ID and location are securely stored and used only for identity
          verification, fraud prevention, and improving service quality. Your
          personal information will never be shared publicly without your
          consent.
        </AppText>
      </View>
    </View>
  );

  // ─── Step 4: Review & Submit ────────────────────────────────────────────
  const renderStep4 = () => (
    <View style={styles.formSection}>
      <View style={styles.sectionHeader}>
        <Check size={28} color={Colors.primary} />
        <AppText variant="h3" weight="bold" style={styles.sectionTitleNoMargin}>
          Review & Submit
        </AppText>
      </View>
      <AppText
        variant="body"
        color={Colors.textSecondary}
      >
        Please review your information before submitting.
      </AppText>

      {/* Instruction Banner */}
      <InfoCard title="Step 4 Instructions: Review &amp; Submit" style={styles.instructionCard}>
        {'\u2022'} Carefully review all your submitted details above.{'\n'}
        {'\u2022'} You{' '}
        <Text style={styles.textBold}>MUST check all 3 confirmation
        checkboxes</Text> below before submitting your application. Unchecked
        boxes will be <InfoCardHighlight>highlighted in red</InfoCardHighlight>.
      </InfoCard>

      {/* Account Section */}
      <View style={styles.reviewCard}>
        <View style={styles.reviewCardHeader}>
          <AppText variant="h4" weight="bold">
            Account for Ayos
          </AppText>
          <Pressable onPress={() => goToStep(1)} hitSlop={8}>
            <Edit3 size={18} color={Colors.primary} />
          </Pressable>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>
            Name
          </AppText>
          <AppText variant="bodySm" weight="medium">
            {[firstName, middleName, lastName].filter(Boolean).join(' ')}
          </AppText>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>
            Email
          </AppText>
          <AppText variant="bodySm" weight="medium">
            {email}
          </AppText>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>
            Phone
          </AppText>
          <AppText variant="bodySm" weight="medium">
            {phone}
          </AppText>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>
            Birthday
          </AppText>
          <AppText variant="bodySm" weight="medium">
            {birthday}
          </AppText>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>
            Gender
          </AppText>
          <AppText variant="bodySm" weight="medium">
            {getGenderLabel()}
          </AppText>
        </View>
      </View>

      {/* Industry Section */}
      <View style={styles.reviewCard}>
        <View style={styles.reviewCardHeader}>
          <AppText variant="h4" weight="bold">
            Industry & Skills
          </AppText>
          <Pressable onPress={() => goToStep(2)} hitSlop={8}>
            <Edit3 size={18} color={Colors.primary} />
          </Pressable>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>
            Industry
          </AppText>
          <AppText variant="bodySm" weight="medium">
            {getIndustryLabel()}
          </AppText>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>
            Employment Type
          </AppText>
          <AppText variant="bodySm" weight="medium">
            {employmentType === 'employed'
              ? 'Employed at a Company'
              : employmentType === 'freelance'
                ? 'Freelance / Independent'
                : '—'}
          </AppText>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>
            Skills
          </AppText>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: Spacing['1'],
              justifyContent: 'flex-end',
            }}
          >
            {getSkillLabels().map((label) => (
              <Chip key={label} label={label} selected size="sm" />
            ))}
          </View>
        </View>
      </View>

      {/* Identity Verification Section */}
      <View style={styles.reviewCard}>
        <View style={styles.reviewCardHeader}>
          <AppText variant="h4" weight="bold">
            Identity Verification
          </AppText>
          <Pressable onPress={() => goToStep(3)} hitSlop={8}>
            <Edit3 size={18} color={Colors.primary} />
          </Pressable>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>
            Government ID
          </AppText>
          <AppText variant="bodySm" weight="medium">
            {getIdTypeLabel()}
          </AppText>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>
            ID Uploads
          </AppText>
          <AppText
            variant="bodySm"
            weight="medium"
            color={frontId && backId ? Colors.verified : Colors.error}
          >
            {frontId && backId ? 'Uploaded' : 'Missing'}
          </AppText>
        </View>
      </View>

      {/* Consent */}
      <View style={[
        styles.consentSection,
        errors.consent ? styles.consentSectionError : null,
      ]}>
        <Pressable
          style={styles.checkboxContainer}
          onPress={() => setInfoAccurate(!infoAccurate)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: infoAccurate }}
          aria-checked={infoAccurate}
          accessibilityLabel="Confirm information is accurate"
        >
          <View
            style={[
              styles.checkbox,
              infoAccurate && styles.checkboxChecked,
              errors.consent && !infoAccurate && styles.checkboxError,
            ]}
          >
            {infoAccurate && (
              <Check color="#ffffff" size={14} strokeWidth={3} />
            )}
          </View>
          <AppText
            variant="bodySm"
            color={Colors.textPrimary}
            style={{ flex: 1 }}
          >
            I confirm that the information provided is accurate.
          </AppText>
        </Pressable>
        <Pressable
          style={styles.checkboxContainer}
          onPress={() => setAgreePrivacy(!agreePrivacy)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreePrivacy }}
          aria-checked={agreePrivacy}
          accessibilityLabel="Agree to the Privacy Policy"
        >
          <View
            style={[
              styles.checkbox,
              agreePrivacy && styles.checkboxChecked,
              errors.consent && !agreePrivacy && styles.checkboxError,
            ]}
          >
            {agreePrivacy && (
              <Check color="#ffffff" size={14} strokeWidth={3} />
            )}
          </View>
          <AppText
            variant="bodySm"
            color={Colors.textPrimary}
            style={{ flex: 1 }}
          >
            I agree to the{' '}
            <AppText
              variant="bodySm"
              weight="bold"
              color={Colors.textLink}
              onPress={() => setLegalModal('PRIVACY')}
            >
              Privacy Policy
            </AppText>
            .
          </AppText>
        </Pressable>
        <Pressable
          style={styles.checkboxContainer}
          onPress={() => setAgreeTerms(!agreeTerms)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreeTerms }}
          aria-checked={agreeTerms}
          accessibilityLabel="Agree to the Terms of Service"
        >
          <View
            style={[
              styles.checkbox,
              agreeTerms && styles.checkboxChecked,
              errors.consent && !agreeTerms && styles.checkboxError,
            ]}
          >
            {agreeTerms && (
              <Check color="#ffffff" size={14} strokeWidth={3} />
            )}
          </View>
          <AppText
            variant="bodySm"
            color={Colors.textPrimary}
            style={{ flex: 1 }}
          >
            I agree to the{' '}
            <AppText
              variant="bodySm"
              weight="bold"
              color={Colors.textLink}
              onPress={() => setLegalModal('TERMS')}
            >
              Terms of Service
            </AppText>
            .
          </AppText>
        </Pressable>
        {errors.consent && (
          <AppText variant="caption" color={Colors.error} weight="bold">
            ⚠️ {errors.consent}
          </AppText>
        )}
      </View>
    </View>
  );

  return (
    <Screen
      scrollable
      keyboardAvoiding={false}
      style={{ paddingBottom: 0 }}
      contentContainerStyle={[
        styles.screenContent,
        { paddingBottom: Spacing['16'] + keyboardHeight },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          hitSlop={8}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft color={Colors.textPrimary} size={24} />
        </Pressable>
        <AppText variant="h2" align="center" style={styles.headerTitle}>
          Register as Worker
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {renderStepper()}

        {submissionError ? (
          <View
            style={[infoCardStyles.card, styles.errorCard]}
            accessibilityRole="alert"
          >
            <View style={[styles.iconBadge, styles.errorBadge]}>
              <AlertCircle size={16} color={Colors.error} />
            </View>
            <View style={infoCardStyles.body}>
              <Text style={[infoCardStyles.title, styles.errorText]}>
                Submission issue
              </Text>
              <Text style={[infoCardStyles.bodyText, styles.errorText]}>
                {submissionError}
              </Text>
            </View>
          </View>
        ) : null}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}

        {submissionStatus ? (
          <View style={[styles.submissionFeedback, styles.submissionProgress]}>
            <AppText variant="bodySm" color={Colors.primary}>
              {submissionStatus}
            </AppText>
          </View>
        ) : null}

        {step < 4 ? (
          <AppButton
            label="Next Step"
            onPress={handleNext}
            rightIcon={<ChevronRight size={20} color={Colors.white} />}
            fullWidth
            style={styles.submitBtn}
          />
        ) : (
          <AppButton
            label="Submit Registration"
            onPress={() => void handleSubmit()}
            loading={submitting}
            fullWidth
            style={styles.submitBtn}
          />
        )}
      </View>

      <Modal visible={showSuccess} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <CircleCheck size={48} color={Colors.verified} />
            </View>
            <AppText
              variant="h2"
              weight="bold"
              style={{ marginBottom: Spacing['2'], textAlign: 'center' }}
            >
              Registration Submitted!
            </AppText>
            <AppText
              variant="body"
              color={Colors.textSecondary}
              style={{ textAlign: 'center', marginBottom: Spacing['2'] }}
            >
              Verification status: Pending
            </AppText>
            <AppText
              variant="body"
              color={Colors.textSecondary}
              style={{ textAlign: 'center', marginBottom: Spacing['2'] }}
            >
              {verificationPendingNotice.message}
            </AppText>
            <AppText
              variant="body"
              color={Colors.textSecondary}
              style={{ textAlign: 'center', marginBottom: Spacing['6'] }}
            >
              Status location: Verification
            </AppText>
            <AppButton
              label="Go to Sign In"
              onPress={() => {
                setShowSuccess(false);
                void supabase.auth.signOut().finally(() => {
                  router.replace('/(auth)/login');
                });
              }}
              fullWidth
            />
          </View>
        </View>
      </Modal>

      <LegalContentModal
        visible={!!legalModal}
        type={legalModal}
        onClose={() => setLegalModal(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing['6'],
    paddingBottom: Spacing['16'],
  },
  header: {
    paddingVertical: Spacing['2'],
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonPressed: {
    backgroundColor: Colors.borderLight,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: Colors.textPrimary,
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingTop: Spacing['4'],
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing['2'],
    marginBottom: Spacing['6'],
  },
  progressStep: {
    flex: 1,
    alignItems: 'center',
  },
  stepDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },
  progressLine: {
    flex: 1,
    height: 3,
    backgroundColor: Colors.border,
  },
  progressLineActive: {
    backgroundColor: Colors.primary,
  },
  progressLineHidden: {
    backgroundColor: 'transparent',
  },
  stepLabel: {
    marginTop: Spacing['1'],
    textAlign: 'center',
  },
  errorCard: {
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceCard,
    borderColor: Colors.error,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBadge: {
    backgroundColor: Colors.errorBg,
  },
  errorText: {
    color: Colors.error,
  },
  textBold: {
    fontWeight: '700',
  },
  formSection: {
    gap: Spacing['4'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    marginBottom: -Spacing['2'],
  },
  sectionTitleNoMargin: {
    marginBottom: 0,
  },
  instructionCard: {
    marginBottom: 0,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing['2'],
  },
  employmentCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['2'],
    paddingVertical: Spacing['4'],
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  employmentCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  industrySelectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing['4'],
    paddingHorizontal: Spacing['4'],
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['8'],
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing['2'],
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.verifiedBg,
    padding: Spacing['4'],
    borderRadius: Radius.lg,
    gap: Spacing['3'],
    borderWidth: 1,
    borderColor: Colors.verified,
  },
  reviewCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing['4'],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing['3'],
    paddingBottom: Spacing['2'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing['1'],
  },
  employmentContainerError: {
    padding: Spacing['2'],
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.error,
    backgroundColor: '#FFF5F5',
  },
  consentSection: {
    gap: Spacing['4'],
    padding: Spacing['2'],
    borderRadius: Radius.lg,
  },
  consentSectionError: {
    borderWidth: 1.5,
    borderColor: Colors.error,
    backgroundColor: '#FFF5F5',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxError: {
    borderColor: Colors.error,
  },
  submitBtn: {
    marginTop: Spacing['4'],
  },
  submissionFeedback: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing['3'],
    marginTop: Spacing['4'],
  },
  submissionProgress: {
    backgroundColor: Colors.primarySurface,
    borderColor: Colors.primaryBorder,
  },
  submissionFailure: {
    backgroundColor: Colors.errorBg,
    borderColor: Colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['4'],
  },
  successCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing['6'],
    alignItems: 'center',
    width: '100%',
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.verifiedBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing['4'],
  },
});
