import React from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import {
  MapPin,
  Calendar,
  Wrench,
} from 'lucide-react-native';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { Chip } from '@/components/Chip';
import { formatSchedule } from '@/utils/format';
import type { RequestDraft } from '@/store/useRequestStore';

interface JobSummaryCompactProps {
  request: RequestDraft;
}

export const JobSummaryCompact = React.memo(function JobSummaryCompact({
  request,
}: JobSummaryCompactProps) {
  return (
    <View style={styles.compactRoot}>
      <View style={styles.compactRow}>
        <AppText variant="h3" weight="bold">
          {request.category || 'Service Request'}
        </AppText>
        <AppText variant="h3" weight="bold" color={Colors.cta}>
          {request.estimatedPriceRange || '--'}
        </AppText>
      </View>

      <View style={styles.compactChipRow}>
        <Chip
          label={request.urgency || 'Unspecified Urgency'}
          selected
          color={Colors.primary}
        />
        {request.hasParts !== undefined && (
          <View style={styles.partsBadge}>
            <Wrench
              size={14}
              color={request.hasParts ? Colors.success : Colors.warning}
              style={{ marginRight: 4 }}
            />
            <AppText
              variant="caption"
              weight="bold"
              color={request.hasParts ? Colors.success : Colors.warning}
            >
              {request.hasParts ? 'Has Parts' : 'Needs Parts'}
            </AppText>
          </View>
        )}
      </View>

      <AppText
        variant="body"
        color={Colors.textSecondary}
        style={styles.compactDesc}
      >
        {request.description ||
          request.aiSummary ||
          'No description provided'}
      </AppText>

      <View style={styles.compactDetailsContainer}>
        {request.photos && request.photos.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: Spacing['2'] }}
            style={{ marginBottom: Spacing['3'] }}
          >
            {request.photos.map((uri, idx) => (
              <Image key={idx} source={{ uri }} style={styles.compactPhoto} />
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.compactMetaRow}>
          <MapPin size={16} color={Colors.textSecondary} />
          <AppText
            variant="bodySm"
            color={Colors.textSecondary}
            style={{ marginLeft: 6, flex: 1 }}
          >
            {request.location?.address || 'Current Location'}
          </AppText>
        </View>
        {request.scheduledDate && (
          <View style={[styles.compactMetaRow, { marginTop: Spacing['2'] }]}>
            <Calendar size={16} color={Colors.textSecondary} />
            <AppText
              variant="bodySm"
              color={Colors.textSecondary}
              style={{ marginLeft: 6, flex: 1 }}
            >
              {formatSchedule(request.scheduledDate)}
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  compactRoot: {
    width: '100%',
  },
  compactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing['2'],
  },
  compactChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing['3'],
    gap: Spacing['2'],
  },
  partsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing['3'],
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySurface,
  },
  compactDesc: {
    marginBottom: Spacing['4'],
    lineHeight: 22,
  },
  compactDetailsContainer: {
    paddingTop: Spacing['3'],
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  compactPhoto: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
  },
  compactMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
