import React from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  Minus,
  Plus,
  Star,
  UsersRound,
} from 'lucide-react-native';
import { Image } from 'expo-image';

import { Button } from '@/components/buttons/Button';
import { RadiusSlider } from '@/components/inputs/RadiusSlider';
import { Screen } from '@/components/layout/Screen';
import { MapSurface } from '@/components/maps/MapSurface';
import { theme } from '@/constants/theme';
import type { DispatchSnapshot, LiveWorkerCandidate } from '@/services/liveDispatch';
import { styles } from './matching.styles';
import { useLiveMatching } from '@/hooks/useLiveMatching';

function diagnosticMessage(
  diagnostic: DispatchSnapshot['diagnostics'] | undefined,
) {
  switch (diagnostic?.reasonCode as string | undefined) {
    case 'NO_CATEGORY_WORKERS':
      return 'No workers in this service category are available nearby.';
    case 'NO_APPROVED_WORKERS':
      return 'Matching workers still need approval.';
    case 'WORKERS_MISSING_SERVICE_AREA':
      return 'Matching workers have not finished setting their service area.';
    case 'WORKERS_OFFLINE':
    case 'NO_FRESH_PRESENCE':
      return 'Eligible workers are currently offline. Try again later.';
    case 'OUTSIDE_SEARCH_RADIUS':
    case 'OUTSIDE_SERVICE_RADIUS':
      return 'No eligible workers were found within your selected radius.';
    default:
      return '';
  }
}

export default function MatchingScreen() {
  const router = useRouter();
  const {
    state,
    center,
    radiusKm,
    setRadiusKm,
    snapshot,
    error,
    selectionError,
    selectingWorkerId,
    candidates,
    accepted,
    secondsLeft,
    startMatching,
    choose,
    reset,
  } = useLiveMatching();

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
          center={center}
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
                {candidates.length} notified Â· {accepted.length} accepted
              </Text>
            </View>
          </View>
          <View style={styles.timer}>
            <Clock size={16} color={theme.colors.primary} />
            <Text style={styles.timerText}>
              {Math.floor(secondsLeft / 60)}:
              {String(secondsLeft % 60).padStart(2, '0')}
            </Text>
          </View>
        </View>
      ) : null}

      {state === 'error' ? (
        <StateMessage
          title="Matching Unavailable"
          message={error}
          action="Try Again"
          onAction={reset}
        />
      ) : null}
      {state === 'expired' && !accepted.length ? (
        <StateMessage
          title="No Worker Accepted Yet"
          message={diagnosticMessage(snapshot?.diagnostics)}
          action="Change Date or Location"
          onAction={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/home');
          }}
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
                {diagnosticMessage(snapshot?.diagnostics) ||
                  `We are notifying eligible workers within your selected ${snapshot?.searchRadiusMeters ? snapshot.searchRadiusMeters / 1000 : radiusKm} km range.`}
              </Text>
            </View>
          ) : (
            candidates.map((worker) => (
              <WorkerCard
                key={worker.dispatchId}
                worker={worker}
                onChoose={() => {
                  void choose(worker).then((booking) => {
                    if (booking)
                      router.replace(`/tracking/${booking.id}` as never);
                  });
                }}
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
          <Text style={styles.secondary}>Confirm a service location first.</Text>
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
          disabled={radiusKm <= 1}
          onPress={() => onChange(radiusKm - 1)}
        >
          <Minus
            color={radiusKm > 1 ? theme.colors.primary : theme.colors.border}
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
          disabled={radiusKm >= 50}
          onPress={() => onChange(radiusKm + 1)}
        >
          <Plus
            color={radiusKm < 50 ? theme.colors.primary : theme.colors.border}
            size={24}
          />
        </TouchableOpacity>
      </View>
      <RadiusSlider
        minimumValue={1}
        maximumValue={50}
        step={1}
        value={radiusKm}
        onValueChange={onChange}
        minimumTrackTintColor={theme.colors.primary}
        maximumTrackTintColor={theme.colors.borderLight}
        thumbTintColor={theme.colors.primary}
      />
      <View style={styles.radiusLabels}>
        <Text style={theme.typography.caption}>1 km</Text>
        <Text style={theme.typography.caption}>50 km</Text>
      </View>
      <Text style={styles.rateNotice}>
        Each matched worker&apos;s saved service rate is shown before you
        choose who to book.
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
      : `â‚±${(worker.rateMinor / 100).toLocaleString('en-PH', {
          minimumFractionDigits: 2,
        })} worker rate`;
  return (
    <View
      style={[styles.card, accepted && styles.acceptedCard]}
    >
      <View style={styles.workerHeader}>
        <Image source={worker.avatar || undefined} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={theme.typography.h4}>{worker.name}</Text>
          <Text style={styles.secondary}>
            {(worker.distanceMeters / 1000).toFixed(1)} km away Â· {priceLabel}
          </Text>
        </View>
        <View
          style={[
            styles.statusPill,
            accepted && styles.acceptedPill,
          ]}
        >
          <Text style={styles.pillText}>
            {accepted ? 'Accepted' : 'Notified'}
          </Text>
        </View>
      </View>
      <View style={styles.rating}>
        <Star size={16} color={theme.colors.warning} />
        <Text style={styles.ratingText}>
          {Number(worker.rating).toFixed(1)} ({worker.reviewCount})
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
          Waiting for this worker to respondâ€¦
        </Text>
      )}
    </View>
  );
}
