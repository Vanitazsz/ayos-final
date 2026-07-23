import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { theme } from '@/constants/theme';
import { ArrowLeft, Minus, Plus } from 'lucide-react-native';
import { RadiusSlider } from '@/components/inputs/RadiusSlider';
import { MapSurface } from '@/components/maps/MapSurface';
import { useRequestStore } from '@/store/useRequestStore';

export default function RadiusConfigScreen() {
  const router = useRouter();
  const draft = useRequestStore();
  const [radius, setRadius] = useState(draft.searchRadiusKm);

  const handleDecrease = () => {
    if (radius > 1) setRadius(radius - 1);
  };

  const handleIncrease = () => {
    if (radius < 50) setRadius(radius + 1);
  };

  const handleSave = () => {
    draft.setDraft({ searchRadiusKm: radius });
    router.back();
  };

  return (
    <Screen safeArea backgroundColor={theme.colors.background}>
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
          Search Radius
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.mapContainer}>
          {draft.coords ? (
            <MapSurface
              center={draft.coords}
              points={[
                {
                  id: 'request-location',
                  ...draft.coords,
                  color: theme.colors.error,
                },
              ]}
              radiusMeters={radius * 1000}
            />
          ) : (
            <Text style={theme.typography.body2}>
              Confirm a service location first.
            </Text>
          )}

          <View style={styles.mapBadge}>
            <Text
              style={[
                theme.typography.caption,
                { color: theme.colors.textPrimary, fontWeight: '700' },
              ]}
            >
              {draft.addressDetails?.city ?? 'Service location'}
            </Text>
          </View>
        </View>

        <View style={styles.configCard}>
          <Text
            style={[theme.typography.h3, { marginBottom: theme.spacing.xs }]}
          >
            Service Radius
          </Text>
          <Text
            style={[
              theme.typography.body2,
              {
                color: theme.colors.textSecondary,
                marginBottom: theme.spacing.xl,
              },
            ]}
          >
            Professionals within this distance will be notified of your request.
          </Text>

          <View style={styles.radiusControlRow}>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={handleDecrease}
            >
              <Minus
                color={radius > 1 ? theme.colors.primary : theme.colors.border}
                size={24}
              />
            </TouchableOpacity>

            <View style={styles.radiusValueContainer}>
              <Text
                style={[theme.typography.h1, { color: theme.colors.primary }]}
              >
                {radius}
              </Text>
              <Text
                style={[
                  theme.typography.h4,
                  {
                    color: theme.colors.textSecondary,
                    marginLeft: 4,
                    marginTop: 8,
                  },
                ]}
              >
                km
              </Text>
            </View>

            <TouchableOpacity
              style={styles.controlBtn}
              onPress={handleIncrease}
            >
              <Plus
                color={radius < 50 ? theme.colors.primary : theme.colors.border}
                size={24}
              />
            </TouchableOpacity>
          </View>

          {/* Platform-specific slider keeps the native control while avoiding duplicate React on web. */}
          <View style={{ marginTop: theme.spacing.sm }}>
            <RadiusSlider
              minimumValue={1}
              maximumValue={50}
              step={1}
              value={radius}
              onValueChange={(val) => setRadius(val)}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor={theme.colors.borderLight}
              thumbTintColor={theme.colors.primary}
            />
          </View>

          <View style={styles.barLabels}>
            <Text style={theme.typography.caption}>1 km</Text>
            <Text style={theme.typography.caption}>50 km</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Button title="Apply Changes" onPress={handleSave} fullWidth />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  content: { flex: 1 },
  mapContainer: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  mapGridPattern: {
    position: 'absolute',
    width: '200%',
    height: '200%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    opacity: 0.5,
  },
  radiusCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(30, 58, 138, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(30, 58, 138, 0.5)',
  },
  mapPin: { zIndex: 10 },
  mapBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    ...theme.shadows.sm,
  },

  configCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    marginTop: -20,
    ...theme.shadows.md,
  },
  radiusControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  radiusValueContainer: { flexDirection: 'row', alignItems: 'center' },

  barLabels: { flexDirection: 'row', justifyContent: 'space-between' },

  footer: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.layout.screenPadding,
    backgroundColor: theme.colors.surface,
  },
});
