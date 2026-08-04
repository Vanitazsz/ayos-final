import { styles } from './NewRequestCreateScreen.styles';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { LegacyButton as Button } from '@/components/AppButton';
import { LegacyTextInput as TextInput } from '@/components/AppInput';
import { theme } from '@/constants/theme';
import {
  ArrowLeft,
  X,
  Wrench,
  Droplets,
  Zap,
  Paintbrush,
  Navigation,
  Camera,
  ImageUp,
  Mic,
  Info,
  ChevronDown,
  Search,
  MapPin,
  ShieldCheck,
} from 'lucide-react-native';
import { LocationPicker } from '@/components/LocationPicker';
import { PhotoCaptureModal } from '@/components/media/PhotoCaptureModal';
import type { useNewRequestCreateScreenController } from '../hooks/useNewRequestCreateScreenController';
import {
  descriptionIsValid,
  addressRequiresCompletion,
  formatAddressParts,
} from '../logic/NewRequestCreateScreenLogic';
const iconFor = (name: string) =>
  name.toLowerCase().includes('elect')
    ? Zap
    : name.toLowerCase().includes('paint')
      ? Paintbrush
      : name.toLowerCase().includes('plumb')
        ? Droplets
        : Wrench;
export function CreateRequestView({
  model,
}: {
  model: ReturnType<typeof useNewRequestCreateScreenController>;
}) {
  const {
    router,
    locationPickerRef,
    scrollRef,
    selectedCategory,
    setSelectedCategory,
    serviceSearchOpen,
    setServiceSearchOpen,
    serviceQuery,
    address,
    setAddress,
    savedAddresses,
    addressDetails,
    setAddressDetails,
    description,
    setDescription,
    coords,
    setCoords,
    visibleServiceCount,
    setVisibleServiceCount,
    addressResults,
    addressSearchLoading,
    addressSearchError,
    locationLoading,
    setLocationLoading,
    locationWarning,
    setLocationWarning,
    setLocationSource,
    setConfirmedAddressLabel,
    errors,
    setErrors,
    consent,
    setConsent,
    saving,
    submissionError,
    setSubmissionError,
    cameraPhoto,
    cameraOpen,
    setCameraOpen,
    customerProfile,
    profileLoading,
    profileError,
    voiceRecord,
    photoStatus,
    voiceStatus,
    photoError,
    voiceError,
    manualAddressMode,
    setManualAddressMode,
    manualAddress,
    setManualAddress,
    voiceRecording,
    voiceBusy,
    recorderState,
    consentRef,
    mediaGenerationRef,
    uploadedMediaRef,
    savedAddressSelectionRef,
    setDraft,
    filteredCategories,
    hasMoreServices,
    activeSavedAddressId,
    updateServiceQuery,
    runMediaAssist,
    removeMedia,
    retryMediaAssist,
    handleNext,
    applySavedAddress,
    selectAddress,
    updateAddress,
    updateManualAddress,
    useCapturedPhoto,
    handleUploadPhoto,
    handleVoiceClick,
    Image,
  } = model;
  return (
    <Screen safeArea scrollable scrollViewRef={scrollRef}>
      <PhotoCaptureModal
        visible={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onUsePhoto={useCapturedPhoto}
      />
      <View
        style={[
          styles.header,
          { paddingHorizontal: theme.layout.screenPadding },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/home');
          }}
          style={styles.backButton}
        >
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text
          style={[theme.typography.h4, { color: theme.colors.textPrimary }]}
        >
          A-yos AI
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {!profileLoading &&
        customerProfile &&
        customerProfile.verificationStatus !== 'verified' ? (
          <TouchableOpacity
            style={styles.verificationBanner}
            onPress={() => router.push('/(auth)/verify-identity')}
          >
            <ShieldCheck color={theme.colors.warning} size={20} />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  theme.typography.label,
                  { color: theme.colors.textPrimary },
                ]}
              >
                {customerProfile.verificationStatus === 'pending'
                  ? 'Identity verification pending'
                  : customerProfile.verificationStatus === 'rejected'
                    ? 'Identity verification rejected'
                    : 'Verify your identity to book services'}
              </Text>
              <Text
                style={[
                  theme.typography.caption,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {customerProfile.verificationStatus === 'pending'
                  ? 'Waiting for an administrator to review your ID.'
                  : 'Tap to submit a government-issued ID.'}
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}
        {profileError ? (
          <View style={styles.profileErrorBanner}>
            <Text style={styles.fieldError}>
              Profile unavailable: {profileError}
            </Text>
          </View>
        ) : null}
        {customerProfile?.subdivisionName ? (
          <View style={styles.subdivisionBanner}>
            <MapPin color={theme.colors.primary} size={16} />
            <Text
              style={[
                theme.typography.body2,
                { color: theme.colors.primary, marginLeft: 6 },
              ]}
            >
              {customerProfile.subdivisionName}
            </Text>
          </View>
        ) : null}
        <Text style={[theme.typography.h2, styles.title]}>
          What do you need help with?
        </Text>

        {/* Categories */}
        <View style={styles.serviceSectionHeader}>
          <Text
            style={[
              theme.typography.label,
              styles.sectionTitle,
              { marginBottom: 0 },
            ]}
          >
            Select Service
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              serviceSearchOpen ? 'Close service search' : 'Search services'
            }
            style={styles.serviceSearchToggle}
            onPress={() => {
              if (serviceSearchOpen) {
                updateServiceQuery('');
                setServiceSearchOpen(false);
              } else setServiceSearchOpen(true);
            }}
          >
            {serviceSearchOpen ? (
              <X color={theme.colors.primary} size={17} />
            ) : (
              <Search color={theme.colors.primary} size={17} />
            )}
            <Text style={styles.serviceSearchToggleText}>
              {serviceSearchOpen ? 'Close' : 'Search'}
            </Text>
          </TouchableOpacity>
        </View>
        {serviceSearchOpen && (
          <TextInput
            autoFocus
            placeholder="Search available services"
            value={serviceQuery}
            onChangeText={updateServiceQuery}
            leftIcon={Search}
            rightIcon={serviceQuery ? X : undefined}
            onRightIconPress={() => updateServiceQuery('')}
            returnKeyType="search"
            accessibilityLabel="Search available services"
            style={styles.serviceSearchInput}
          />
        )}
        <View
          style={[
            styles.categoriesRow,
            !hasMoreServices && styles.categoriesRowComplete,
          ]}
        >
          {filteredCategories.slice(0, visibleServiceCount).map((cat) => {
            const Icon = iconFor(cat.name);
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                testID="request-service-option"
                accessibilityRole="radio"
                accessibilityLabel={cat.name}
                accessibilityState={{ checked: isSelected }}
                aria-checked={isSelected}
                style={[
                  styles.categoryItemRow,
                  isSelected && styles.categoryItemSelected,
                ]}
                onPress={() => {
                  setSelectedCategory(cat.id);
                  setErrors((current) => ({ ...current, service: '' }));
                }}
              >
                <Icon
                  color={
                    isSelected
                      ? theme.colors.primary
                      : theme.colors.textSecondary
                  }
                  size={24}
                />
                <Text
                  style={[
                    theme.typography.caption,
                    {
                      color: isSelected
                        ? theme.colors.primary
                        : theme.colors.textSecondary,
                      marginTop: theme.spacing.xs,
                      fontSize: 10,
                      textAlign: 'center',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {serviceQuery.trim() && filteredCategories.length === 0 ? (
          <View style={styles.noServicesState}>
            <Search color={theme.colors.textTertiary} size={28} />
            <Text style={styles.noServicesText}>No services found</Text>
          </View>
        ) : null}
        {errors.service ? (
          <Text style={styles.fieldError}>{errors.service}</Text>
        ) : null}
        {hasMoreServices && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="See more services"
            style={styles.seeMoreServicesButton}
            onPress={() =>
              setVisibleServiceCount((count) =>
                Math.min(count + 4, filteredCategories.length),
              )
            }
          >
            <Text style={styles.seeMoreServicesText}>See more services</Text>
            <ChevronDown color={theme.colors.primary} size={18} />
          </TouchableOpacity>
        )}

        {/* Camera */}
        <Text style={[theme.typography.label, styles.sectionTitle]}>
          Camera
        </Text>
        {cameraPhoto ? (
          <View style={styles.mediaPreview}>
            <Image
              source={cameraPhoto}
              style={styles.mediaImg}
              contentFit="cover"
            />
            <TouchableOpacity
              style={styles.removeMediaBtn}
              onPress={() => removeMedia('photo')}
            >
              <X color={theme.colors.surface} size={16} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.photoActionRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Take Photo"
              style={[styles.mediaUploadBtn, styles.photoAction]}
              onPress={() => setCameraOpen(true)}
            >
              <Camera color={theme.colors.primary} size={32} />
              <Text
                style={[
                  theme.typography.caption,
                  { color: theme.colors.primary, marginTop: theme.spacing.xs },
                ]}
              >
                Take Photo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Upload Photo"
              style={[styles.mediaUploadBtn, styles.photoAction]}
              onPress={() => void handleUploadPhoto()}
            >
              <ImageUp color={theme.colors.primary} size={32} />
              <Text
                style={[
                  theme.typography.caption,
                  { color: theme.colors.primary, marginTop: theme.spacing.xs },
                ]}
              >
                Upload Photo
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {cameraPhoto && photoStatus !== 'idle' ? (
          <View style={styles.mediaStatusRow}>
            {photoStatus === 'uploading' || photoStatus === 'processing' ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : null}
            <Text style={styles.mediaStatusText}>
              {photoStatus === 'uploading'
                ? 'Uploading photo…'
                : photoStatus === 'awaiting-consent'
                  ? 'Ready. Accept AI consent to analyze this photo.'
                  : photoStatus === 'processing'
                    ? 'AI is explaining the visible problem…'
                    : photoStatus === 'completed'
                      ? 'Photo explanation added to the description.'
                      : photoError}
            </Text>
            {photoStatus === 'failed' ? (
              <TouchableOpacity onPress={() => retryMediaAssist('photo')}>
                <Text style={styles.mediaRetryText}>Retry</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Voice */}
        <Text
          style={[
            theme.typography.label,
            styles.sectionTitle,
            { marginTop: theme.spacing.lg },
          ]}
        >
          Voice
        </Text>
        {voiceRecord ? (
          <View style={styles.mediaPreview}>
            <View
              style={[
                styles.mediaImg,
                { backgroundColor: theme.colors.primary },
              ]}
            />
            <View style={styles.voiceLabelOverlay}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                Voice Content:{' '}
                {Math.max(1, Math.ceil(recorderState.durationMillis / 1000))}s
              </Text>
            </View>
            <TouchableOpacity
              style={styles.removeMediaBtn}
              onPress={() => removeMedia('voice')}
            >
              <X color={theme.colors.surface} size={16} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.mediaUploadBtn}
            disabled={voiceBusy}
            onPress={handleVoiceClick}
          >
            <Mic color={theme.colors.primary} size={32} />
            <Text
              style={[
                theme.typography.caption,
                { color: theme.colors.primary, marginTop: theme.spacing.xs },
              ]}
            >
              {voiceBusy
                ? 'Please wait…'
                : voiceRecording
                  ? `Stop (${Math.floor(recorderState.durationMillis / 1000)}s)`
                  : 'Record Voice'}
            </Text>
          </TouchableOpacity>
        )}
        {voiceRecord && voiceStatus !== 'idle' ? (
          <View style={styles.mediaStatusRow}>
            {voiceStatus === 'uploading' || voiceStatus === 'processing' ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : null}
            <Text style={styles.mediaStatusText}>
              {voiceStatus === 'uploading'
                ? 'Uploading voice recording…'
                : voiceStatus === 'awaiting-consent'
                  ? 'Ready. Accept AI consent to transcribe this recording.'
                  : voiceStatus === 'processing'
                    ? 'Transcribing your recording…'
                    : voiceStatus === 'completed'
                      ? 'Transcript added to the description.'
                      : voiceError}
            </Text>
            {voiceStatus === 'failed' ? (
              <TouchableOpacity onPress={() => retryMediaAssist('voice')}>
                <Text style={styles.mediaRetryText}>Retry</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Description */}
        <Text
          style={[
            theme.typography.label,
            styles.sectionTitle,
            { marginTop: theme.spacing.lg },
          ]}
        >
          Describe the problem
        </Text>
        <TextInput
          placeholder="e.g. The sink is leaking under the cabinet..."
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={(value) => {
            setDescription(value);
            if (descriptionIsValid(value))
              setErrors((current) => ({ ...current, description: '' }));
          }}
          error={errors.description}
          style={styles.textArea}
          textAlignVertical="top"
        />

        {/* Location Picker */}
        <View style={styles.locationHeaderRow}>
          <Text
            style={[
              theme.typography.label,
              styles.sectionTitle,
              { marginBottom: 0 },
            ]}
          >
            Service Location
          </Text>
          <View style={styles.locationControls}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Use current location"
              style={styles.currentLocationBtn}
              onPress={() =>
                void locationPickerRef.current?.useCurrentLocation()
              }
              disabled={locationLoading}
            >
              <Navigation color={theme.colors.primary} size={14} />
              <Text
                style={[
                  theme.typography.caption,
                  {
                    color: theme.colors.primary,
                    marginLeft: 4,
                    fontWeight: '600',
                  },
                ]}
              >
                {locationLoading ? 'Detecting…' : 'Use Current'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {savedAddresses.length ? (
          <View style={styles.savedAddressSection}>
            <View style={styles.savedAddressHeader}>
              <Text style={styles.savedAddressTitle}>Saved addresses</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Manage saved addresses"
                onPress={() => router.push('/settings/addresses')}
              >
                <Text style={styles.savedAddressManage}>Manage</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.savedAddressList}>
              {savedAddresses.map((savedAddress) => {
                const selected = activeSavedAddressId === savedAddress.id;
                return (
                  <TouchableOpacity
                    key={savedAddress.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    aria-checked={selected}
                    accessibilityLabel={`Use saved address ${savedAddress.label}`}
                    style={[
                      styles.savedAddressChip,
                      selected && styles.savedAddressChipSelected,
                    ]}
                    onPress={() => applySavedAddress(savedAddress)}
                  >
                    <MapPin
                      color={
                        selected ? theme.colors.surface : theme.colors.primary
                      }
                      size={15}
                    />
                    <View style={styles.savedAddressChipText}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.savedAddressChipLabel,
                          selected && styles.savedAddressChipLabelSelected,
                        ]}
                      >
                        {savedAddress.label}
                        {savedAddress.isDefault ? ' · Default' : ''}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.savedAddressChipDetail,
                          selected && styles.savedAddressChipDetailSelected,
                        ]}
                      >
                        {savedAddress.barangay}, {savedAddress.city}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Add a saved address"
            style={styles.addSavedAddressButton}
            onPress={() => router.push('/settings/addresses')}
          >
            <MapPin color={theme.colors.primary} size={16} />
            <Text style={styles.savedAddressManage}>
              Save an address for future bookings
            </Text>
          </TouchableOpacity>
        )}
        <TextInput
          placeholder="Enter complete address"
          value={address}
          onChangeText={updateAddress}
          leftIcon={MapPin}
          rightIcon={address ? X : undefined}
          onRightIconPress={() => updateAddress('')}
          error={errors.address}
          style={styles.addressInput}
        />
        {addressSearchLoading ? (
          <View style={styles.addressSearchStatus}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.addressSearchStatusText}>
              Searching Philippine addresses…
            </Text>
          </View>
        ) : null}
        {addressResults.length > 0 ? (
          <View style={styles.addressResults}>
            {addressResults.map((result) => (
              <TouchableOpacity
                key={`${result.providerId}:${result.longitude}:${result.latitude}`}
                accessibilityRole="button"
                accessibilityLabel={`Use address ${result.displayLabel}`}
                style={styles.addressResultRow}
                onPress={() => selectAddress(result)}
              >
                <MapPin color={theme.colors.primary} size={18} />
                <Text style={styles.addressResultText}>
                  {result.displayLabel ||
                    formatAddressParts([
                      result.line,
                      result.barangay,
                      result.city,
                      result.province,
                    ])}
                </Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.attribution}>
              © OpenStreetMap contributors, OpenRouteService
            </Text>
          </View>
        ) : null}
        {addressSearchError ? (
          <Text style={styles.addressSearchError}>{addressSearchError}</Text>
        ) : null}
        {locationWarning ? (
          <Text style={styles.locationWarning}>{locationWarning}</Text>
        ) : null}
        {manualAddressMode ? (
          <View style={styles.manualAddressCard}>
            <Text style={styles.manualAddressTitle}>Complete the address</Text>
            <Text style={styles.manualAddressHelp}>
              Your map point is saved. These details are required so the worker
              can find you.
            </Text>
            <TextInput
              placeholder="Barangay"
              value={manualAddress.barangay}
              onChangeText={(value) => updateManualAddress('barangay', value)}
              error={errors.barangay}
            />
            <TextInput
              placeholder="City or municipality"
              value={manualAddress.city}
              onChangeText={(value) => updateManualAddress('city', value)}
              error={errors.city}
            />
            <TextInput
              placeholder="Province"
              value={manualAddress.province}
              onChangeText={(value) => updateManualAddress('province', value)}
              error={errors.province}
            />
            <TextInput
              placeholder="Postal code (optional)"
              value={manualAddress.postalCode}
              onChangeText={(value) => updateManualAddress('postalCode', value)}
              keyboardType="number-pad"
            />
            {errors.locationDetails ? (
              <Text style={styles.fieldError}>{errors.locationDetails}</Text>
            ) : null}
          </View>
        ) : null}
        <LocationPicker
          ref={locationPickerRef}
          coords={coords}
          showAction={false}
          error={errors.location}
          onLoadingChange={setLocationLoading}
          onWarning={(message) => {
            setLocationWarning(message ?? '');
            if (message) setManualAddressMode(true);
          }}
          onCoordinatesDetected={(nextCoords) => {
            setCoords(nextCoords);
            savedAddressSelectionRef.current = null;
            setLocationSource('gps');
            setConfirmedAddressLabel('');
            setAddressDetails(null);
            setErrors((current) => ({ ...current, location: '' }));
            setDraft({ addressId: null, addressDetails: null });
          }}
          onLocationDetected={(details, nextCoords, displayLabel) => {
            const label =
              displayLabel ||
              formatAddressParts([
                details.streetNumber,
                details.street,
                details.district,
                details.city,
                details.region,
                details.postalCode,
              ]);
            setCoords(nextCoords);
            savedAddressSelectionRef.current = null;
            setAddress(label);
            setConfirmedAddressLabel(label);
            setLocationSource('gps');
            setAddressDetails(details);
            setManualAddress({
              barangay: details.district,
              city: details.city,
              province: details.region,
              postalCode: details.postalCode,
            });
            setManualAddressMode(addressRequiresCompletion(details));
            setLocationWarning('');
            setErrors((current) => ({ ...current, address: '', location: '' }));
            setDraft({ addressId: null, addressDetails: details });
          }}
        />

        {/* AI Workflow Info */}
        <View style={styles.infoCard}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.spacing.sm,
            }}
          >
            <Info color={theme.colors.primary} size={16} />
            <Text
              style={[
                theme.typography.label,
                { marginLeft: 8, color: theme.colors.primary },
              ]}
            >
              How A-yos AI Works
            </Text>
          </View>
          <View style={{ marginLeft: 24 }}>
            <Text style={[theme.typography.caption, styles.infoBullet]}>
              • Customer uploads a photo of the problem
            </Text>
            <Text style={[theme.typography.caption, styles.infoBullet]}>
              • Customer records or enters a spoken or written description
            </Text>
            <Text style={[theme.typography.caption, styles.infoBullet]}>
              • AI identifies the likely issue
            </Text>
            <Text style={[theme.typography.caption, styles.infoBullet]}>
              • AI shows urgency, possible cause, suggested service category,
              estimated cost, and safety advice
            </Text>
            <Text style={[theme.typography.caption, styles.infoBullet]}>
              • AI creates an editable request draft
            </Text>
            <Text style={[theme.typography.caption, styles.infoBullet]}>
              • Customer can save the draft and continue later
            </Text>
          </View>
          <TouchableOpacity
            style={styles.consentRow}
            onPress={() => {
              const nextConsent = !consent;
              consentRef.current = nextConsent;
              setConsent(nextConsent);
              setErrors((current) => ({ ...current, consent: '' }));
              setSubmissionError('');
              if (nextConsent) {
                if (
                  uploadedMediaRef.current.photo &&
                  photoStatus === 'awaiting-consent'
                )
                  void runMediaAssist(
                    'photo',
                    uploadedMediaRef.current.photo,
                    mediaGenerationRef.current.photo,
                  );
                if (
                  uploadedMediaRef.current.voice &&
                  voiceStatus === 'awaiting-consent'
                )
                  void runMediaAssist(
                    'voice',
                    uploadedMediaRef.current.voice,
                    mediaGenerationRef.current.voice,
                  );
              }
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent }}
          >
            <View
              style={[styles.consentBox, consent && styles.consentBoxChecked]}
            />
            <Text
              style={[
                theme.typography.caption,
                { flex: 1, color: theme.colors.textSecondary },
              ]}
            >
              I consent for Gemini to process this request and for OpenAI to
              process it only after retryable Gemini failures. Consent version{' '}
              {process.env.EXPO_PUBLIC_AI_CONSENT_VERSION ?? '2026-07-21'}.
            </Text>
          </TouchableOpacity>
          {errors.consent ? (
            <Text style={styles.fieldError}>{errors.consent}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.footer}>
        {submissionError ? (
          <View style={styles.submissionErrorCard}>
            <Text accessibilityRole="alert" style={styles.submissionError}>
              {submissionError}
            </Text>
            {customerProfile?.verificationStatus !== 'verified' &&
            customerProfile?.verificationStatus !== 'pending' ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Verify identity now"
                onPress={() => router.push('/(auth)/verify-identity')}
              >
                <Text style={styles.submissionErrorAction}>
                  Verify identity now
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
        <Button
          title={profileLoading ? 'Loading profile…' : 'Continue'}
          accessibilityLabel="Continue with AI"
          onPress={() => void handleNext(true)}
          loading={saving}
          disabled={saving || profileLoading}
          fullWidth
        />
        <TouchableOpacity
          style={styles.manualButton}
          onPress={() => void handleNext(false)}
          disabled={saving || profileLoading}
        >
          <Text
            style={[theme.typography.button, { color: theme.colors.primary }]}
          >
            Continue without AI
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}
