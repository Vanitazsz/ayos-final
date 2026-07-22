import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Briefcase,
  Wrench,
  MapPin,
  User,
  Eye,
  EyeOff,
  Square,
  Check,
  ShieldCheck,
  Edit3,
  Building2,
  X,
} from 'lucide-react-native';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { AppSelect, SelectOption } from '@/components/AppSelect';
import { AppAutocomplete } from '@/components/AppAutocomplete';
import { Chip } from '@/components/Chip';
import { ImageUploadCard } from '@/components/ImageUploadCard';
import { fetchIndustriesAndSkills } from '@/services/api';
import { submitWorkerApplication } from '@/services/workerApplication';

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
const phoneRegex = /^(09|\+639)\d{9}$/;
const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function RegisterWorkerScreen() {
  const [step, setStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
  const [employmentType, setEmploymentType] = useState<'employed' | 'freelance' | ''>('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  // Step 3: Office Address + Contact Info
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

  // Consent
  const [infoAccurate, setInfoAccurate] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [keyboardUp, setKeyboardUp] = useState(false);
  const [industries,setIndustries]=useState<SelectOption[]>([]);
  const [skillsByIndustry,setSkillsByIndustry]=useState<Record<string,SelectOption[]>>({});
  const [submitting,setSubmitting]=useState(false);
  const [catalogLoading,setCatalogLoading]=useState(true);
  const [catalogError,setCatalogError]=useState('');

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardUp(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardUp(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  const loadIndustryCatalog=useCallback(async()=>{setCatalogLoading(true);setCatalogError('');const result=await fetchIndustriesAndSkills();if(result.error){setIndustries([]);setSkillsByIndustry({});setCatalogError(result.error);}else{setIndustries(result.data.map((row)=>({label:row.name,value:row.id})));setSkillsByIndustry(Object.fromEntries(result.data.map((row)=>[row.id,row.skills.map((skill)=>({label:skill.name,value:skill.id}))])));if(result.data.length===0)setCatalogError('No active industries are available.');}setCatalogLoading(false);},[]);
  useEffect(()=>{void loadIndustryCatalog();},[loadIndustryCatalog]);

  const availableSkills = industryValue ? skillsByIndustry[industryValue] || [] : [];

  const toggleSkill = (skillValue: string) => {
    if(!availableSkills.some((skill)=>skill.value===skillValue))return;
    setSelectedSkills((prev)=>{if(prev.includes(skillValue)){setErrors((current)=>({...current,skills:''}));return prev.filter((value)=>value!==skillValue);}if(prev.length>=10){setErrors((current)=>({...current,skills:'Select up to 10 skills'}));return prev;}setErrors((current)=>({...current,skills:''}));return[...prev,skillValue];});
  };

  const handleIndustryTextChange=(text:string)=>{const selectedLabel=industries.find((option)=>option.value===industryValue)?.label;setIndustry(text);if(!selectedLabel||text!==selectedLabel){setIndustryValue('');setSelectedSkills([]);setSkillInput('');}};

  const handleBirthdayChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 2) {
      formatted = digits.slice(0, 2) + '/' + digits.slice(2);
    }
    if (digits.length > 4) {
      formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
    }
    setBirthday(formatted);
  };

  const validateStep1 = () => {
    const e:Record<string,string>={};if(!firstName)e.firstName='First name is required';if(!lastName)e.lastName='Last name is required';if(!emailRegex.test(email))e.email='Valid email is required';if(!phoneRegex.test(phone))e.phone='Valid Philippine number required';if(!birthday)e.birthday='Birthday is required';if(!passwordRegex.test(password))e.password='Use 8+ characters with uppercase, number, and symbol';if(password!==confirmPassword)e.confirmPassword='Passwords do not match';setErrors(e);return Object.keys(e).length===0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!industryValue || !industries.some((option)=>option.value===industryValue)) e.industry = 'Please select a primary industry';
    if (!employmentType) e.employmentType = 'Please select employment type';
    if (selectedSkills.length === 0) e.skills = 'Select at least one skill';
    else if (selectedSkills.length > 10) e.skills = 'Select up to 10 skills';
    else if (selectedSkills.some((value)=>!availableSkills.some((skill)=>skill.value===value))) e.skills = 'Select skills from the chosen industry';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e: Record<string, string> = {};
    if (!street) e.street = 'Street is required';
    if (!city) e.city = 'City is required';
    if (!region) e.region = 'Province is required';
    if (!contactPerson) e.contactPerson = 'Contact person is required';
    if (!contactPhone || !phoneRegex.test(contactPhone)) e.contactPhone = 'Valid phone number required';
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
      router.back();
    }
  };

  const handleSubmit = async () => {
    if (!infoAccurate || !agreePrivacy || !agreeTerms) {
      setErrors({ consent: 'Please agree to all required consents' });
      return;
    }
    setErrors({});setSubmitting(true);try{const result=await submitWorkerApplication({email,password,displayName:[firstName,middleName,lastName].filter(Boolean).join(' '),bio:`${getIndustryLabel()} — ${employmentType}`,experience:getSkillLabels().join(', '),frontId:frontId!,backId:backId!,identityData:{firstName,middleName,lastName,phone,birthday,gender,industryId:industryValue,skillIds:selectedSkills,employmentType,address:{streetNumber,street,barangay:district,city,province:region,postalCode},contactPerson,contactPhone,idType,consents:{informationAccurate:infoAccurate,privacy:agreePrivacy,terms:agreeTerms}}});if(result.requiresEmailVerification){setErrors({consent:'Verify your email, sign in, then submit the worker application again.'});return;}setShowSuccess(true);}catch(error){setErrors({consent:error instanceof Error?error.message:'Application was not submitted'});}finally{setSubmitting(false);}
  };

  const goToStep = (target: number) => {
    setStep(target);
    setErrors({});
  };

  const getIndustryLabel = () => industries.find((i) => i.value === industryValue)?.label || '';
  const getSkillLabels = () => selectedSkills.flatMap((sv) => {const skill=availableSkills.find((option)=>option.value===sv);return skill?[skill.label]:[];});
  const getIdTypeLabel = () => ID_TYPES.find((i) => i.value === idType)?.label || '';
  const getGenderLabel = () => GENDERS.find((g) => g.value === gender)?.label || 'Not specified';

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {[1, 2, 3, 4].map((item, index) => (
        <View key={item} style={styles.progressStep}>
          <View style={[styles.progressDot, step >= item ? styles.progressDotActive : null]}>
            {step > item ? (
              <CircleCheck size={16} color={Colors.white} />
            ) : (
              <AppText variant="caption" weight="bold" color={step === item ? Colors.white : Colors.textTertiary}>
                {item}
              </AppText>
            )}
          </View>
          {index < 3 && <View style={[styles.progressLine, step > item ? styles.progressLineActive : null]} />}
        </View>
      ))}
    </View>
  );

  const stepLabels = ['Account', 'Industry', 'Address', 'Review'];

  const renderStepLabels = () => (
    <View style={styles.stepLabelsContainer}>
      {stepLabels.map((label, i) => (
        <AppText
          key={label}
          variant="caption"
          weight={step === i + 1 ? 'bold' : 'regular'}
          color={step === i + 1 ? Colors.primary : Colors.textTertiary}
        >
          {label}
        </AppText>
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
      <AppText variant="body" color={Colors.textSecondary} style={{ marginBottom: Spacing['4'] }}>
        Create your worker account credentials. This will be used to sign in.
      </AppText>

      <AppInput
        label="First Name"
        placeholder="Enter first name"
        value={firstName}
        onChangeText={setFirstName}
        error={errors.firstName}
      />
      <AppInput
        label="Middle Name (Optional)"
        placeholder="Enter middle name"
        value={middleName}
        onChangeText={setMiddleName}
      />
      <AppInput
        label="Last Name"
        placeholder="Enter last name"
        value={lastName}
        onChangeText={setLastName}
        error={errors.lastName}
      />
      <AppInput
        label="Email Address"
        placeholder="Enter email address"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <AppInput
        label="Mobile Number"
        placeholder="Enter mobile number"
        value={phone}
        onChangeText={setPhone}
        error={errors.phone}
        keyboardType="phone-pad"
      />
      <AppInput
        label="Birthday"
        placeholder="MM/DD/YYYY"
        value={birthday}
        onChangeText={handleBirthdayChange}
        error={errors.birthday}
        keyboardType="number-pad"
        maxLength={10}
      />
      <AppSelect
        label="Gender (Optional)"
        options={GENDERS}
        value={gender}
        onSelect={setGender}
        placeholder="Select gender"
        containerStyle={{ marginBottom: Spacing['4'] }}
      />
      <AppInput
        label="Password"
        placeholder="Min. 8 chars, 1 Upper, 1 Number, 1 Special"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry={!showPassword}
        rightIcon={showPassword ? <EyeOff size={20} color={Colors.textTertiary} /> : <Eye size={20} color={Colors.textTertiary} />}
        onRightIconPress={() => setShowPassword(!showPassword)}
      />
      <AppInput
        label="Confirm Password"
        placeholder="Re-type password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={errors.confirmPassword}
        secureTextEntry={!showPassword}
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
      <AppText variant="body" color={Colors.textSecondary} style={{ marginBottom: Spacing['4'] }}>
        Select your primary industry and the services you offer.
      </AppText>

      <AppText variant="label" style={{ marginBottom: Spacing['2'] }}>
        Primary Industry
      </AppText>
      {industryValue && !isEditingIndustry ? (
        <Pressable
          style={styles.industrySelectedCard}
          onPress={() => setIsEditingIndustry(true)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], flex: 1 }}>
            <Briefcase size={20} color={Colors.white} />
            <AppText variant="body" weight="bold" color={Colors.white} style={{ flex: 1 }}>
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
            if(option.value!==industryValue){setSelectedSkills([]);setSkillInput('');}
            setIndustry(option.label);
            setIndustryValue(option.value);
            setIsEditingIndustry(false);
          }}
          options={industries}
          placeholder="Type or select your industry"
          error={errors.industry}
          allowCustom={false}
          maxSuggestions={10}
          containerStyle={{ marginBottom: Spacing['4'] }}
        />
      )}
      {catalogLoading&&<AppText variant="caption" color={Colors.textSecondary} style={{marginBottom:Spacing['3']}}>Loading industries from the service catalog…</AppText>}
      {!catalogLoading&&catalogError&&<Pressable onPress={()=>{void loadIndustryCatalog();}}><AppText variant="caption" color={Colors.error} style={{marginBottom:Spacing['3']}}>{catalogError} Tap to retry.</AppText></Pressable>}

      <AppText variant="label" style={{ marginBottom: Spacing['2'] }}>
        Employment Type
      </AppText>
      <View style={{ flexDirection: 'row', gap: Spacing['3'], marginBottom: Spacing['4'] }}>
        <Pressable
          style={[
            styles.employmentCard,
            employmentType === 'employed' && styles.employmentCardSelected,
          ]}
          onPress={() => setEmploymentType('employed')}
        >
          <Building2
            size={24}
            color={employmentType === 'employed' ? Colors.white : Colors.textTertiary}
          />
          <AppText
            variant="bodySm"
            weight={employmentType === 'employed' ? 'bold' : 'regular'}
            color={employmentType === 'employed' ? Colors.white : Colors.textSecondary}
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
            color={employmentType === 'freelance' ? Colors.white : Colors.textTertiary}
          />
          <AppText
            variant="bodySm"
            weight={employmentType === 'freelance' ? 'bold' : 'regular'}
            color={employmentType === 'freelance' ? Colors.white : Colors.textSecondary}
          >
            Freelance / Independent
          </AppText>
        </Pressable>
      </View>
      {errors.employmentType && (
        <AppText variant="caption" color={Colors.error} style={{ marginBottom: Spacing['3'] }}>
          {errors.employmentType}
        </AppText>
      )}

      {industryValue ? (
        <>
          <AppAutocomplete
            label="Skills / Services"
            value={skillInput}
            onChangeText={setSkillInput}
            options={availableSkills}
            placeholder="Type or select skills"
            error={errors.skills}
            multiSelect
            selectedValues={selectedSkills}
            onToggle={toggleSkill}
            allowCustom={false}
            containerStyle={{ marginBottom: Spacing['3'] }}
          />
          {selectedSkills.length > 0 && (
            <View style={styles.chipGrid}>
              {selectedSkills.map((sv) => {
                const match = availableSkills.find((s) => s.value === sv);
                if(!match)return null;
                return (
                  <Chip
                    key={sv}
                    label={match.label}
                    selected
                    onPress={() => toggleSkill(sv)}
                    rightIcon={<X size={14} color={Colors.white} />}
                    size="sm"
                  />
                );
              })}
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyState}>
          <Wrench size={32} color={Colors.textTertiary} />
          <AppText variant="body" color={Colors.textTertiary} style={{ marginTop: Spacing['2'] }}>
            Select an industry to see available skills
          </AppText>
        </View>
      )}
    </View>
  );

  // ─── Step 3: Office Address + Contact Info ──────────────────────────────
  const renderStep3 = () => (
    <View style={styles.formSection}>
      <View style={styles.sectionHeader}>
        <MapPin size={28} color={Colors.primary} />
        <AppText variant="h3" weight="bold" style={styles.sectionTitleNoMargin}>
          Office Address & Contact
        </AppText>
      </View>
      <AppText variant="body" color={Colors.textSecondary} style={{ marginBottom: Spacing['4'] }}>
        Where is your office or primary service location? Also provide a backup contact.
      </AppText>

      <AppText variant="h4" weight="bold" style={{ marginBottom: Spacing['3'] }}>
        Office Address
      </AppText>

      <View style={{ flexDirection: 'row', gap: Spacing['3'] }}>
        <AppInput
          label="House/Unit No."
          value={streetNumber}
          onChangeText={setStreetNumber}
          containerStyle={{ flex: 1 }}
        />
        <AppInput
          label="Street"
          value={street}
          onChangeText={setStreet}
          error={errors.street}
          containerStyle={{ flex: 2 }}
        />
      </View>
      <AppInput
        label="Barangay"
        value={district}
        onChangeText={setDistrict}
      />
      <View style={{ flexDirection: 'row', gap: Spacing['3'] }}>
        <AppInput
          label="City / Municipality"
          value={city}
          onChangeText={setCity}
          error={errors.city}
          containerStyle={{ flex: 1 }}
        />
        <AppInput
          label="Province"
          value={region}
          onChangeText={setRegion}
          error={errors.region}
          containerStyle={{ flex: 1 }}
        />
      </View>
      <AppInput
        label="ZIP Code"
        value={postalCode}
        onChangeText={setPostalCode}
        keyboardType="number-pad"
      />

      <View style={styles.divider} />

      <AppText variant="h4" weight="bold" style={{ marginBottom: Spacing['3'] }}>
        Contact Information
      </AppText>

      <AppInput
        label="Contact Person Name"
        placeholder="Full name of contact person"
        value={contactPerson}
        onChangeText={setContactPerson}
        error={errors.contactPerson}
      />
      <AppInput
        label="Contact Person Phone"
        placeholder="Enter contact number"
        value={contactPhone}
        onChangeText={setContactPhone}
        error={errors.contactPhone}
        keyboardType="phone-pad"
      />

      <View style={styles.divider} />

      <AppText variant="h4" weight="bold" style={{ marginBottom: Spacing['3'] }}>
        Identity Verification
      </AppText>

      <AppSelect
        label="Select Valid Government ID"
        options={ID_TYPES}
        value={idType}
        onSelect={setIdType}
        error={errors.idType}
        containerStyle={{ marginBottom: Spacing['4'] }}
      />
      <ImageUploadCard
        label="Upload Front of ID"
        onImageSelected={setFrontId}
        error={errors.frontId}
        containerStyle={{ marginBottom: Spacing['4'] }}
      />
      <ImageUploadCard
        label="Upload Back of ID"
        onImageSelected={setBackId}
        error={errors.backId}
        containerStyle={{ marginBottom: Spacing['4'] }}
      />

      <View style={styles.privacyNotice}>
        <ShieldCheck size={24} color={Colors.verified} />
        <AppText variant="caption" color={Colors.textSecondary} style={{ flex: 1 }}>
          Your ID and location are securely stored and used only for identity verification, fraud prevention, and improving service quality. Your personal information will never be shared publicly without your consent.
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
      <AppText variant="body" color={Colors.textSecondary} style={{ marginBottom: Spacing['4'] }}>
        Please review your information before submitting.
      </AppText>

      {/* Account Section */}
      <View style={styles.reviewCard}>
        <View style={styles.reviewCardHeader}>
          <AppText variant="h4" weight="bold">Account for Ayos</AppText>
          <Pressable onPress={() => goToStep(1)} hitSlop={8}>
            <Edit3 size={18} color={Colors.primary} />
          </Pressable>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>Name</AppText>
          <AppText variant="bodySm" weight="medium">{[firstName, middleName, lastName].filter(Boolean).join(' ')}</AppText>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>Email</AppText>
          <AppText variant="bodySm" weight="medium">{email}</AppText>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>Phone</AppText>
          <AppText variant="bodySm" weight="medium">{phone}</AppText>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>Birthday</AppText>
          <AppText variant="bodySm" weight="medium">{birthday}</AppText>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>Gender</AppText>
          <AppText variant="bodySm" weight="medium">{getGenderLabel()}</AppText>
        </View>
      </View>

      {/* Industry Section */}
      <View style={styles.reviewCard}>
        <View style={styles.reviewCardHeader}>
          <AppText variant="h4" weight="bold">Industry & Skills</AppText>
          <Pressable onPress={() => goToStep(2)} hitSlop={8}>
            <Edit3 size={18} color={Colors.primary} />
          </Pressable>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>Industry</AppText>
          <AppText variant="bodySm" weight="medium">{getIndustryLabel()}</AppText>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>Employment Type</AppText>
          <AppText variant="bodySm" weight="medium">
            {employmentType === 'employed' ? 'Employed at a Company' : employmentType === 'freelance' ? 'Freelance / Independent' : '—'}
          </AppText>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>Skills</AppText>
          <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['1'], justifyContent: 'flex-end' }}>
            {getSkillLabels().map((label) => (
              <Chip key={label} label={label} selected size="sm" />
            ))}
          </View>
        </View>
      </View>

      {/* Address Section */}
      <View style={styles.reviewCard}>
        <View style={styles.reviewCardHeader}>
          <AppText variant="h4" weight="bold">Address & Contact</AppText>
          <Pressable onPress={() => goToStep(3)} hitSlop={8}>
            <Edit3 size={18} color={Colors.primary} />
          </Pressable>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>Office Address</AppText>
          <AppText variant="bodySm" weight="medium" style={{ textAlign: 'right', flex: 1 }}>
            {[streetNumber, street, district, city, region].filter(Boolean).join(', ')}
            {postalCode ? ` ${postalCode}` : ''}
          </AppText>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>Contact Person</AppText>
          <AppText variant="bodySm" weight="medium">{contactPerson}</AppText>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>Contact Phone</AppText>
          <AppText variant="bodySm" weight="medium">{contactPhone}</AppText>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>Government ID</AppText>
          <AppText variant="bodySm" weight="medium">{getIdTypeLabel()}</AppText>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>ID Uploads</AppText>
          <AppText variant="bodySm" weight="medium" color={frontId && backId ? Colors.verified : Colors.error}>
            {frontId && backId ? 'Uploaded' : 'Missing'}
          </AppText>
        </View>
      </View>

      {/* Consent */}
      <View style={styles.consentSection}>
        <Pressable style={styles.checkboxContainer} onPress={() => setInfoAccurate(!infoAccurate)}>
          {infoAccurate ? <Check size={24} color={Colors.primary} /> : <Square size={24} color={Colors.textTertiary} />}
          <AppText variant="bodySm" color={Colors.textPrimary} style={{ flex: 1 }}>
            I confirm that the information provided is accurate.
          </AppText>
        </Pressable>
        <Pressable style={styles.checkboxContainer} onPress={() => setAgreePrivacy(!agreePrivacy)}>
          {agreePrivacy ? <Check size={24} color={Colors.primary} /> : <Square size={24} color={Colors.textTertiary} />}
          <AppText variant="bodySm" color={Colors.textPrimary} style={{ flex: 1 }}>
            I agree to the <AppText variant="bodySm" weight="bold" color={Colors.textLink}>Privacy Policy</AppText>.
          </AppText>
        </Pressable>
        <Pressable style={styles.checkboxContainer} onPress={() => setAgreeTerms(!agreeTerms)}>
          {agreeTerms ? <Check size={24} color={Colors.primary} /> : <Square size={24} color={Colors.textTertiary} />}
          <AppText variant="bodySm" color={Colors.textPrimary} style={{ flex: 1 }}>
            I agree to the <AppText variant="bodySm" weight="bold" color={Colors.textLink}>Terms of Service</AppText>.
          </AppText>
        </Pressable>
        {errors.consent && (
          <AppText variant="caption" color={Colors.error}>{errors.consent}</AppText>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={handleBack} hitSlop={12} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.textPrimary} />
        </Pressable>
        <AppText variant="h4" weight="bold">Register as Worker</AppText>
        <View style={{ width: 24 }} />
      </View>

      {renderProgressBar()}
      {renderStepLabels()}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => Keyboard.dismiss()}
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: keyboardUp ? 10 : 30 }]}>
        {step < 4 ? (
          <AppButton
            label="Next Step"
            onPress={handleNext}
            rightIcon={<ChevronRight size={20} color={Colors.white} />}
            fullWidth
          />
        ) : (
          <AppButton
            label="Submit Registration"
            onPress={()=>void handleSubmit()}
            loading={submitting}
            fullWidth
          />
        )}
      </View>

      <Modal visible={showSuccess} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <CircleCheck size={48} color={Colors.verified} />
            </View>
            <AppText variant="h2" weight="bold" style={{ marginBottom: Spacing['2'], textAlign: 'center' }}>
              Registration Submitted!
            </AppText>
            <AppText variant="body" color={Colors.textSecondary} style={{ textAlign: 'center', marginBottom: Spacing['6'] }}>
              Your worker account is under review. We will notify you once you&apos;re verified and ready to accept jobs.
            </AppText>
            <AppButton
              label="Go to Sign In"
              onPress={() => {
                setShowSuccess(false);
                router.replace('/(auth)/login');
              }}
              fullWidth
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: Spacing['4'],
    paddingBottom: Spacing['4'],
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    padding: Spacing['1'],
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['4'],
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing['8'],
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },
  progressLine: {
    width: 32,
    height: 3,
    backgroundColor: Colors.border,
    marginHorizontal: -4,
    zIndex: 1,
  },
  progressLineActive: {
    backgroundColor: Colors.primary,
  },
  stepLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing['8'],
    paddingBottom: Spacing['3'],
    backgroundColor: Colors.white,
  },
  scrollContent: {
    paddingHorizontal: Spacing['4'],
    paddingTop: Spacing['6'],
    paddingBottom: Spacing['16'],
  },
  formSection: {
    gap: Spacing['2'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    marginBottom: Spacing['2'],
  },
  sectionTitleNoMargin: {
    marginBottom: 0,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing['2'],
    marginBottom: Spacing['4'],
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
    marginBottom: Spacing['4'],
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
    marginVertical: Spacing['5'],
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.verifiedBg,
    padding: Spacing['4'],
    borderRadius: Radius.lg,
    gap: Spacing['3'],
    marginTop: Spacing['5'],
    borderWidth: 1,
    borderColor: Colors.verified,
  },
  reviewCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing['4'],
    marginBottom: Spacing['3'],
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
  consentSection: {
    gap: Spacing['4'],
    marginTop: Spacing['4'],
    marginBottom: Spacing['4'],
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  footer: {
    padding: Spacing['4'],
    paddingBottom: 10,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
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
