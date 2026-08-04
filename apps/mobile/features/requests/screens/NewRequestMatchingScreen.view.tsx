import { styles } from './NewRequestMatchingScreen.styles';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  Minus,
  Plus,
  Star,
  UsersRound,
} from 'lucide-react-native';
import { LegacyButton as Button } from '@/components/AppButton';
import { RadiusSlider } from '@/components/inputs/RadiusSlider';
import { Screen } from '@/components/layout/Screen';
import { MapSurface } from '@/components/maps/MapSurface';
import { theme } from '@/constants/theme';
import { Image } from 'expo-image';
import type {
  DispatchSnapshot,
  LiveWorkerCandidate,
} from '../logic/NewRequestMatchingScreenLogic';
import {
  dispatchDiagnosticMessage,
  SEARCH_RADIUS_MAX_KM,
  SEARCH_RADIUS_MIN_KM,
} from '../logic/NewRequestMatchingScreenLogic';
import type { useNewRequestMatchingScreenController } from '../hooks/useNewRequestMatchingScreenController';
import {
  formatCountdown,
  formatKm,
  formatPesoMinor,
  formatRating,
} from '@/utils/format';

function RadiusConfiguration({
  center,
  radiusKm,
  onChange,
  onStart,
}: {
  center: { latitude: number; longitude: number } | null;
  radiusKm: number;
  onChange: (radius: number) => void;
  onStart: () => void;
}) {
  return (
    <ScrollView
      style={styles.configurationScroll}
      contentContainerStyle={styles.configuration}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.mapContainer}>
        {center ? (
          <MapSurface
            center={center}
            points={[
              { id: 'service-location', ...center, color: theme.colors.error },
            ]}
            radiusMeters={radiusKm * 1000}
          />
        ) : (
          <Text style={styles.secondary}>
            Confirm a service location first.
          </Text>
        )}
      </View>
      <Text style={theme.typography.h3}>Choose search radius</Text>
      <Text style={styles.configurationMessage}>
        Only eligible workers within this distance will be notified.
      </Text>
      <View style={styles.radiusControlRow}>
        <TouchableOpacity
          accessibilityLabel="Decrease search radius"
          style={styles.controlButton}
          disabled={radiusKm <= SEARCH_RADIUS_MIN_KM}
          onPress={() => onChange(radiusKm - 1)}
        >
          <Minus
            color={
              radiusKm > SEARCH_RADIUS_MIN_KM
                ? theme.colors.primary
                : theme.colors.border
            }
            size={24}
          />
        </TouchableOpacity>
        <View style={styles.radiusValue}>
          <Text style={[theme.typography.h1, { color: theme.colors.primary }]}>
            {radiusKm}
          </Text>
          <Text style={[theme.typography.h4, styles.kilometers]}>km</Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Increase search radius"
          style={styles.controlButton}
          disabled={radiusKm >= SEARCH_RADIUS_MAX_KM}
          onPress={() => onChange(radiusKm + 1)}
        >
          <Plus
            color={
              radiusKm < SEARCH_RADIUS_MAX_KM
                ? theme.colors.primary
                : theme.colors.border
            }
            size={24}
          />
        </TouchableOpacity>
      </View>
      <RadiusSlider
        minimumValue={SEARCH_RADIUS_MIN_KM}
        maximumValue={SEARCH_RADIUS_MAX_KM}
        step={1}
        value={radiusKm}
        onValueChange={onChange}
        minimumTrackTintColor={theme.colors.primary}
        maximumTrackTintColor={theme.colors.borderLight}
        thumbTintColor={theme.colors.primary}
      />
      <View style={styles.radiusLabels}>
        <Text style={theme.typography.caption}>{SEARCH_RADIUS_MIN_KM} km</Text>
        <Text style={theme.typography.caption}>{SEARCH_RADIUS_MAX_KM} km</Text>
      </View>
      <Text style={styles.rateNotice}>
        Each matched worker&apos;s saved service rate is shown before you choose
        who to book.
      </Text>
      <Button
        title={`Start Matching within ${radiusKm} km`}
        onPress={onStart}
        fullWidth
      />
    </ScrollView>
  );
}

function StateMessage({
  title,
  message,
  action,
  onAction,
}: {
  title: string;
  message: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.state}>
      <AlertCircle size={56} color={theme.colors.error} />
      <Text style={theme.typography.h3}>{title}</Text>
      <Text style={styles.secondary}>{message}</Text>
      <Button title={action} onPress={onAction} fullWidth />
    </View>
  );
}

function WorkerCard({
  worker,
  onChoose,
  choosing,
  selectionDisabled,
}: {
  worker: LiveWorkerCandidate;
  onChoose: () => void;
  choosing: boolean;
  selectionDisabled: boolean;
}) {
  const accepted = worker.status === 'ACCEPTED';
  const priceLabel =
    worker.rateMinor == null
      ? 'Price pending'
      : `${formatPesoMinor(worker.rateMinor)} worker rate`;
  return (
    <View style={[styles.card, accepted && styles.acceptedCard]}>
      <View style={styles.workerHeader}>
        <Image source={worker.avatar || undefined} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={theme.typography.h4}>{worker.name}</Text>
          <Text style={styles.secondary}>
            {formatKm(worker.distanceMeters)} km away · {priceLabel}
          </Text>
        </View>
        <View style={[styles.statusPill, accepted && styles.acceptedPill]}>
          <Text style={styles.pillText}>
            {accepted ? 'Accepted' : 'Notified'}
          </Text>
        </View>
      </View>
      <View style={styles.rating}>
        <Star size={16} color={theme.colors.warning} />
        <Text>
          {formatRating(worker.rating)} ({worker.reviewCount})
        </Text>
      </View>
      {accepted ? (
        <Button
          title="Accept Worker"
          onPress={onChoose}
          loading={choosing}
          disabled={selectionDisabled}
          fullWidth
        />
      ) : (
        <Text style={styles.secondary}>
          Waiting for this worker to respond…
        </Text>
      )}
    </View>
  );
}
export function MatchingView({
  model,
}: {
  model: ReturnType<typeof useNewRequestMatchingScreenController>;
}) {
  const {
    router,
    draft,
    state,
    setState,
    radiusKm,
    setRadiusKm,
    snapshot,
    error,
    setError,
    selectionError,
    selectingWorkerId,
    candidates,
    accepted,
    secondsLeft,
    startMatching,
    choose,
  } = model;
  return (
    <Screen safeArea>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/home');
          }}
        >
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={theme.typography.h4}>Live Worker Matching</Text>
        <View style={{ width: 24 }} />
      </View>

      {state === 'configuring' ? (
        <RadiusConfiguration
          center={draft.coords}
          radiusKm={radiusKm}
          onChange={setRadiusKm}
          onStart={() => void startMatching()}
        />
      ) : null}

      {state === 'starting' || state === 'live' ? (
        <View style={styles.status}>
          <View style={styles.statusCopy}>
            <Text style={theme.typography.h4}>
              Searching within {radiusKm} km
            </Text>
            <Text style={styles.secondary}>
              Matched workers will appear here as they respond.
            </Text>
            <View style={styles.matchCount}>
              <UsersRound size={16} color={theme.colors.primary} />
              <Text style={styles.matchCountText}>
                {candidates.length} notified · {accepted.length} accepted
              </Text>
            </View>
          </View>
          <View style={styles.timer}>
            <Clock size={16} color={theme.colors.primary} />
            <Text style={styles.timerText}>{formatCountdown(secondsLeft)}</Text>
          </View>
        </View>
      ) : null}

      {state === 'error' ? (
        <StateMessage
          title="Matching Unavailable"
          message={error}
          action="Try Again"
          onAction={() => {
            setError('');
            setState('configuring');
          }}
        />
      ) : null}
      {state === 'expired' && !accepted.length ? (
        <StateMessage
          title="No Worker Accepted Yet"
          message={dispatchDiagnosticMessage(snapshot?.diagnostics)}
          action="Change Date or Location"
          onAction={() => router.back()}
        />
      ) : null}

      {state === 'starting' || state === 'live' || accepted.length > 0 ? (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
        >
          {selectionError ? (
            <View
              accessibilityLiveRegion="assertive"
              accessibilityRole="alert"
              style={styles.selectionError}
            >
              <AlertCircle size={18} color={theme.colors.error} />
              <Text style={styles.selectionErrorText}>{selectionError}</Text>
            </View>
          ) : null}
          {!candidates.length ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <UsersRound size={30} color={theme.colors.primary} />
              </View>
              <Text style={theme.typography.h4}>Looking for workers</Text>
              <Text style={styles.emptyMessage}>
                {dispatchDiagnosticMessage(snapshot?.diagnostics) ||
                  `We are notifying eligible workers within your selected ${snapshot?.searchRadiusMeters ? snapshot.searchRadiusMeters / 1000 : radiusKm} km range.`}
              </Text>
            </View>
          ) : (
            candidates.map((worker) => (
              <WorkerCard
                key={worker.dispatchId}
                worker={worker}
                onChoose={() => void choose(worker)}
                choosing={selectingWorkerId === worker.workerId}
                selectionDisabled={selectingWorkerId !== null}
              />
            ))
          )}
        </ScrollView>
      ) : null}
    </Screen>
  );
}
