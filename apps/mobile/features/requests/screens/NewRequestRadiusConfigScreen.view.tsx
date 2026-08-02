import { styles } from './NewRequestRadiusConfigScreen.styles';
import { View, Text, TouchableOpacity } from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { LegacyButton as Button } from '@/components/AppButton';
import { theme } from '@/constants/theme';
import { ArrowLeft, Minus, Plus } from 'lucide-react-native';
import { RadiusSlider } from '@/components/inputs/RadiusSlider';
import { MapSurface } from '@/components/maps/MapSurface';
import type { useNewRequestRadiusConfigScreenController } from '../hooks/useNewRequestRadiusConfigScreenController';

export function RadiusConfigView({
  model,
}: {
  model: ReturnType<typeof useNewRequestRadiusConfigScreenController>;
}) {
  const {
    router,
    draft,
    radius,
    setRadius,
    handleDecrease,
    handleIncrease,
    handleSave,
  } = model;
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
