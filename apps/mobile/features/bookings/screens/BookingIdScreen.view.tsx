import { styles } from './BookingIdScreen.styles';
import { View, ScrollView, Pressable } from 'react-native';
import {
  ChevronLeft,
  Check,
  MapPin,
  Clock,
  Calendar,
} from 'lucide-react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { RatingStars } from '@/components/RatingStars';
import type { useBookingIdScreenController } from '../hooks/useBookingIdScreenController';
const weekDays = Array.from({ length: 7 }, (_, index) => {
  const value = new Date();
  value.setDate(value.getDate() + index);
  return {
    id: String(index),
    day: value.toLocaleDateString('en-PH', { weekday: 'short' }),
    date: String(value.getDate()),
    today: index === 0,
    iso: value.toISOString(),
  };
});

const timeSlots = ['08:00', '10:00', '13:00', '15:00', '17:00'].map(
  (label, index) => ({ id: String(index), label, available: true }),
);
export function BookingView({
  model,
}: {
  model: ReturnType<typeof useBookingIdScreenController>;
}) {
  const {
    id,
    provider,
    selectedDay,
    setSelectedDay,
    selectedSlot,
    setSelectedSlot,
    address,
    setAddress,
    notes,
    setNotes,
    handleBack,
    handleContinue,
  } = model;
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={handleBack} hitSlop={12}>
          <ChevronLeft size={22} color={Colors.textPrimary} strokeWidth={2.5} />
        </Pressable>
        <AppText variant="h4" weight="bold">
          Schedule Booking
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Provider Summary */}
        <View style={styles.providerSummary}>
          <Avatar uri={provider.avatarUri} size={48} />
          <View style={styles.providerInfo}>
            <View style={styles.providerNameRow}>
              <AppText variant="body" weight="bold">
                {provider.name}
              </AppText>
              {provider.verified && (
                <Badge label="Verified" variant="verified" />
              )}
            </View>
            <AppText variant="caption" color={Colors.textSecondary}>
              {provider.category}
            </AppText>
            <RatingStars
              rating={provider.rating}
              size={13}
              showValue
              reviewCount={provider.reviewCount}
            />
          </View>
          <AppText variant="h4" weight="bold" color={Colors.cta}>
            {provider.price}
          </AppText>
        </View>

        {/* Select Date */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Calendar size={18} color={Colors.cta} strokeWidth={2} />
            <AppText variant="body" weight="semiBold">
              Select Date
            </AppText>
          </View>
          <View style={styles.weekRow}>
            {weekDays.map((d) => (
              <Pressable
                key={d.id}
                onPress={() => setSelectedDay(d.id)}
                style={[
                  styles.dayCard,
                  {
                    backgroundColor:
                      selectedDay === d.id ? Colors.cta : Colors.white,
                    borderColor:
                      selectedDay === d.id ? Colors.cta : Colors.border,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  weight="semiBold"
                  color={
                    selectedDay === d.id ? Colors.white : Colors.textSecondary
                  }
                >
                  {d.day}
                </AppText>
                <AppText
                  variant="h4"
                  weight="bold"
                  color={
                    selectedDay === d.id ? Colors.white : Colors.textPrimary
                  }
                  style={{ marginTop: 2 }}
                >
                  {d.date}
                </AppText>
                {d.today && (
                  <View
                    style={[
                      styles.todayDot,
                      {
                        backgroundColor:
                          selectedDay === d.id ? Colors.white : Colors.cta,
                      },
                    ]}
                  />
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Select Time */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Clock size={18} color={Colors.cta} strokeWidth={2} />
            <AppText variant="body" weight="semiBold">
              Select Time
            </AppText>
          </View>
          <View style={styles.slotsGrid}>
            {timeSlots.map((slot) => (
              <Pressable
                key={slot.id}
                disabled={!slot.available}
                onPress={() => setSelectedSlot(slot.id)}
                style={[
                  styles.slotCard,
                  {
                    backgroundColor:
                      selectedSlot === slot.id ? Colors.cta : Colors.white,
                    borderColor:
                      selectedSlot === slot.id
                        ? Colors.cta
                        : slot.available
                          ? Colors.border
                          : Colors.borderLight,
                    opacity: slot.available ? 1 : 0.4,
                  },
                ]}
              >
                <AppText
                  variant="bodySm"
                  weight="semiBold"
                  color={
                    selectedSlot === slot.id
                      ? Colors.white
                      : slot.available
                        ? Colors.textPrimary
                        : Colors.textTertiary
                  }
                >
                  {slot.label}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Service Address */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <MapPin size={18} color={Colors.cta} strokeWidth={2} />
            <AppText variant="body" weight="semiBold">
              Service Address
            </AppText>
          </View>
          <AppInput
            value={address}
            onChangeText={setAddress}
            placeholder="Enter your address"
            style={{ marginTop: Spacing['3'] }}
            leftIcon={
              <MapPin size={20} color={Colors.textTertiary} strokeWidth={2} />
            }
          />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <AppText variant="body" weight="semiBold">
            Additional Notes
          </AppText>
          <AppInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Describe the issue or special requests..."
            multiline
            numberOfLines={4}
            style={{ marginTop: Spacing['3'] }}
            inputStyle={{ minHeight: 80, textAlignVertical: 'top' }}
          />
        </View>

        {/* Replacement Parts */}
        {notes.trim() && (
          <View style={styles.section}>
            <AppText variant="body" weight="semiBold">
              Replacement Parts
            </AppText>
            <View
              style={{
                marginTop: Spacing['3'],
                padding: Spacing['3'],
                backgroundColor: Colors.surfaceCard,
                borderRadius: Radius.md,
                borderWidth: 1,
                borderColor: Colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Check size={16} color={Colors.warning} />
                <AppText
                  variant="body"
                  weight="semiBold"
                  style={{ marginLeft: Spacing['2'], color: Colors.warning }}
                >
                  Additional request notes
                </AppText>
              </View>
              {notes ? (
                <AppText
                  variant="caption"
                  color={Colors.textSecondary}
                  style={{ marginTop: Spacing['2'] }}
                >
                  {notes}
                </AppText>
              ) : null}
            </View>
          </View>
        )}

        {/* Price Summary */}
        <View style={[styles.section, { paddingBottom: Spacing['4'] }]}>
          <AppText variant="body" weight="semiBold">
            Price Summary
          </AppText>
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <AppText variant="bodySm" color={Colors.textSecondary}>
                Service Rate
              </AppText>
              <AppText variant="bodySm" weight="semiBold">
                {provider.price}
              </AppText>
            </View>
            <View style={styles.priceRow}>
              <AppText variant="bodySm" color={Colors.textSecondary}>
                Platform Fee
              </AppText>
              <AppText variant="bodySm" weight="semiBold">
                Included
              </AppText>
            </View>
            <View style={styles.priceRow}>
              <AppText variant="bodySm" color={Colors.textSecondary}>
                Payment
              </AppText>
              <AppText
                variant="bodySm"
                weight="semiBold"
                color={Colors.success}
              >
                Cash after service
              </AppText>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceRow}>
              <AppText variant="body" weight="bold">
                Total
              </AppText>
              <AppText variant="h4" weight="bold" color={Colors.cta}>
                {provider.price}
              </AppText>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <AppButton
          label="Continue to Payment"
          size="lg"
          fullWidth
          onPress={handleContinue}
          disabled={!selectedSlot}
        />
      </View>
    </View>
  );
}
