import { styles } from './RegisterWorkerScreen.styles';
import {
  View,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Modal,
} from 'react-native';
import {
  Briefcase,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Edit3,
  Eye,
  EyeOff,
  MapPin,
  ShieldCheck,
  Square,
  User,
  Wrench,
  X,
} from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppSelect } from '@/components/AppSelect';
import { AppAutocomplete } from '@/components/AppAutocomplete';
import { Chip } from '@/components/Chip';
import { ImageUploadCard } from '@/components/ImageUploadCard';
import type { useRegisterWorkerScreenController } from '../hooks/useRegisterWorkerScreenController';

export function RegisterWorkerView({
  model,
}: {
  model: ReturnType<typeof useRegisterWorkerScreenController>;
}) {
  const {
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
    loadIndustryCatalog,
    goToStep,
    getIndustryLabel,
    getSkillLabels,
    getIdTypeLabel,
    getGenderLabel,
    handleBirthdayChange,
    handleNext,
    handleBack,
    handleSubmit,
    router,
  } = model;
  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {[1, 2, 3, 4].map((item, index) => (
        <View key={item} style={styles.progressStep}>
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
          {index < 3 && (
            <View
              style={[
                styles.progressLine,
                step > item ? styles.progressLineActive : null,
              ]}
            />
          )}
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
        style={{ marginBottom: Spacing['4'] }}
      >
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
        rightIcon={
          showPassword ? (
            <EyeOff size={20} color={Colors.textTertiary} />
          ) : (
            <Eye size={20} color={Colors.textTertiary} />
          )
        }
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
        style={{ marginBottom: Spacing['4'] }}
      >
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
              setSkillInput('');
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
          containerStyle={{ marginBottom: Spacing['4'] }}
        />
      )}
      {catalogLoading && (
        <AppText
          variant="caption"
          color={Colors.textSecondary}
          style={{ marginBottom: Spacing['3'] }}
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
            style={{ marginBottom: Spacing['3'] }}
          >
            {catalogError} Tap to retry.
          </AppText>
        </Pressable>
      )}

      <AppText variant="label" style={{ marginBottom: Spacing['2'] }}>
        Employment Type
      </AppText>
      <View
        style={{
          flexDirection: 'row',
          gap: Spacing['3'],
          marginBottom: Spacing['4'],
        }}
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
          style={{ marginBottom: Spacing['3'] }}
        >
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
                if (!match) return null;
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
  const renderStep3 = () => (
    <View style={styles.formSection}>
      <View style={styles.sectionHeader}>
        <MapPin size={28} color={Colors.primary} />
        <AppText variant="h3" weight="bold" style={styles.sectionTitleNoMargin}>
          Office Address & Contact
        </AppText>
      </View>
      <AppText
        variant="body"
        color={Colors.textSecondary}
        style={{ marginBottom: Spacing['4'] }}
      >
        Where is your office or primary service location? Also provide a backup
        contact.
      </AppText>

      <AppText
        variant="h4"
        weight="bold"
        style={{ marginBottom: Spacing['3'] }}
      >
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
      <AppInput label="Barangay" value={district} onChangeText={setDistrict} />
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

      <AppText
        variant="h4"
        weight="bold"
        style={{ marginBottom: Spacing['3'] }}
      >
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

      <AppText
        variant="h4"
        weight="bold"
        style={{ marginBottom: Spacing['3'] }}
      >
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
        style={{ marginBottom: Spacing['4'] }}
      >
        Please review your information before submitting.
      </AppText>

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

      {/* Address Section */}
      <View style={styles.reviewCard}>
        <View style={styles.reviewCardHeader}>
          <AppText variant="h4" weight="bold">
            Address & Contact
          </AppText>
          <Pressable onPress={() => goToStep(3)} hitSlop={8}>
            <Edit3 size={18} color={Colors.primary} />
          </Pressable>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>
            Office Address
          </AppText>
          <AppText
            variant="bodySm"
            weight="medium"
            style={{ textAlign: 'right', flex: 1 }}
          >
            {[streetNumber, street, district, city, region]
              .filter(Boolean)
              .join(', ')}
            {postalCode ? ` ${postalCode}` : ''}
          </AppText>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>
            Contact Person
          </AppText>
          <AppText variant="bodySm" weight="medium">
            {contactPerson}
          </AppText>
        </View>
        <View style={styles.reviewRow}>
          <AppText variant="bodySm" color={Colors.textSecondary}>
            Contact Phone
          </AppText>
          <AppText variant="bodySm" weight="medium">
            {contactPhone}
          </AppText>
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
      <View style={styles.consentSection}>
        <Pressable
          style={styles.checkboxContainer}
          onPress={() => setInfoAccurate(!infoAccurate)}
        >
          {infoAccurate ? (
            <Check size={24} color={Colors.primary} />
          ) : (
            <Square size={24} color={Colors.textTertiary} />
          )}
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
        >
          {agreePrivacy ? (
            <Check size={24} color={Colors.primary} />
          ) : (
            <Square size={24} color={Colors.textTertiary} />
          )}
          <AppText
            variant="bodySm"
            color={Colors.textPrimary}
            style={{ flex: 1 }}
          >
            I agree to the{' '}
            <AppText variant="bodySm" weight="bold" color={Colors.textLink}>
              Privacy Policy
            </AppText>
            .
          </AppText>
        </Pressable>
        <Pressable
          style={styles.checkboxContainer}
          onPress={() => setAgreeTerms(!agreeTerms)}
        >
          {agreeTerms ? (
            <Check size={24} color={Colors.primary} />
          ) : (
            <Square size={24} color={Colors.textTertiary} />
          )}
          <AppText
            variant="bodySm"
            color={Colors.textPrimary}
            style={{ flex: 1 }}
          >
            I agree to the{' '}
            <AppText variant="bodySm" weight="bold" color={Colors.textLink}>
              Terms of Service
            </AppText>
            .
          </AppText>
        </Pressable>
        {errors.consent && (
          <AppText variant="caption" color={Colors.error}>
            {errors.consent}
          </AppText>
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
        <AppText variant="h4" weight="bold">
          Register as Worker
        </AppText>
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
        {submissionStatus ? (
          <View style={[styles.submissionFeedback, styles.submissionProgress]}>
            <AppText variant="bodySm" color={Colors.primary}>
              {submissionStatus}
            </AppText>
          </View>
        ) : null}
        {submissionError ? (
          <View style={[styles.submissionFeedback, styles.submissionFailure]}>
            <AppText variant="bodySm" color={Colors.error}>
              {submissionError}
            </AppText>
          </View>
        ) : null}
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
            onPress={() => void handleSubmit()}
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
              style={{ textAlign: 'center', marginBottom: Spacing['6'] }}
            >
              Your worker account is under review. We will notify you once
              you&apos;re verified and ready to accept jobs.
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
