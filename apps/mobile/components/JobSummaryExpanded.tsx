import React from 'react';
import { View, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Edit3, Image as ImageIcon, MapPin, Calendar, Wrench } from 'lucide-react-native';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { Chip } from '@/components/Chip';
import { formatSchedule } from '@/utils/format';
import type { RequestDraft } from '@/store/useRequestStore';

interface JobSummaryExpandedProps {
  request: RequestDraft;
  showEditButtons?: boolean;
}

export const JobSummaryExpanded = React.memo(function JobSummaryExpanded({
  request,
  showEditButtons = false,
}: JobSummaryExpandedProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="h3" style={styles.sectionTitle}>
            Photos
          </AppText>
        </View>
        {request.photos && request.photos.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoScroll}
          >
            {request.photos.map((uri, idx) => (
              <Image key={idx} source={{ uri }} style={styles.photo} />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.noPhoto}>
            <ImageIcon size={24} color={Colors.textTertiary} />
            <AppText variant="caption" style={{ color: Colors.textTertiary }}>
              No photos provided
            </AppText>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="h3" style={styles.sectionTitle}>
            Job Details
          </AppText>
          {showEditButtons && (
            <Pressable
              onPress={() => router.push('/new-request/issue-summary' as any)}
            >
              <Edit3 size={18} color={Colors.primary} />
            </Pressable>
          )}
        </View>
        <View style={styles.card}>
          <AppText variant="body" weight="semiBold" style={{ marginBottom: 4 }}>
            Problem Description
          </AppText>
          <AppText variant="body" style={styles.summaryText}>
            {request.description || request.aiSummary || 'Not provided'}
          </AppText>

          <View style={styles.chipRow}>
            {request.category && (
              <Chip label={request.category} style={styles.chip} />
            )}
            <Chip
              label={request.urgency || 'Unspecified Urgency'}
              selected
              color={Colors.primary}
              style={styles.chip}
            />
          </View>

          {request.scheduledDate && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Calendar size={16} color={Colors.cta} />
              </View>
              <AppText variant="body">
                {formatSchedule(request.scheduledDate)}
              </AppText>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="h3" style={styles.sectionTitle}>
            Replacement Parts
          </AppText>
        </View>
        <View style={styles.card}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: request.partsDescription ? Spacing[2] : 0,
            }}
          >
            <Wrench
              size={16}
              color={request.hasParts ? Colors.success : Colors.warning}
              style={{ marginRight: Spacing[2] }}
            />
            <AppText variant="body" weight="semiBold">
              {request.hasParts
                ? 'Customer Has Parts'
                : 'Provider Will Bring Parts'}
            </AppText>
          </View>
          {request.hasParts && request.partsDescription ? (
            <View style={{ marginTop: Spacing[2] }}>
              <AppText variant="caption" color={Colors.textSecondary}>
                Parts Description
              </AppText>
              <AppText variant="body">{request.partsDescription}</AppText>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="h3" style={styles.sectionTitle}>
            Location
          </AppText>
        </View>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MapPin
              size={20}
              color={Colors.textSecondary}
              style={{ marginRight: Spacing[3] }}
            />
            <View style={{ flex: 1 }}>
              <AppText variant="body" weight="semiBold">
                Service Address
              </AppText>
              <AppText variant="caption" color={Colors.textSecondary}>
                {request.location?.address || 'Current Location'}
              </AppText>
            </View>
          </View>
        </View>
      </View>

      {request.estimatedPriceRange && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText variant="h3" style={styles.sectionTitle}>
              Estimated Price Range
            </AppText>
          </View>
          <View style={styles.card}>
            <AppText variant="h4" weight="bold" color={Colors.cta}>
              {request.estimatedPriceRange}
            </AppText>
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  section: {
    marginBottom: Spacing['6'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing['3'],
  },
  sectionTitle: {
    fontSize: 18,
    color: Colors.textPrimary,
  },
  photoScroll: {
    gap: Spacing['2'],
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: Radius.lg,
  },
  noPhoto: {
    height: 100,
    backgroundColor: Colors.border,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['1'],
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing['4'],
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  summaryText: {
    lineHeight: 22,
    color: Colors.textSecondary,
    marginBottom: Spacing['3'],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing['2'],
    marginTop: Spacing['2'],
  },
  chip: {
    marginRight: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing['4'],
    paddingTop: Spacing['3'],
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing['2'],
  },
});
