import React from 'react';
import { View, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Edit3, Image as ImageIcon, MapPin, Calendar, Clock, Wrench } from 'lucide-react-native';
import { Colors, Layout, Spacing, Radius } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { Chip } from '@/components/Chip';
import { RequestState } from '@/context/RequestContext';

interface JobSummaryProps {
  request: RequestState;
  showEditButtons?: boolean;
  compact?: boolean;
}

export function JobSummary({ request, showEditButtons = false, compact = false }: JobSummaryProps) {
  const router = useRouter();

  if (compact) {
    return (
      <View style={styles.compactRoot}>
        {/* Header Row: Category & Price */}
        <View style={styles.compactRow}>
          <AppText variant="h3" weight="bold">{request.category || 'Service Request'}</AppText>
          <AppText variant="h3" weight="bold" color={Colors.cta}>{request.estimatedPriceRange || '--'}</AppText>
        </View>

        {/* Tags */}
        <View style={styles.compactChipRow}>
          <Chip label={request.urgency || 'Unspecified Urgency'} selected color={Colors.primary} />
          {request.hasParts !== undefined && (
            <View style={styles.partsBadge}>
              <Wrench size={14} color={request.hasParts ? Colors.success : Colors.warning} style={{ marginRight: 4 }} />
              <AppText variant="caption" weight="bold" color={request.hasParts ? Colors.success : Colors.warning}>
                {request.hasParts ? 'Has Parts' : 'Needs Parts'}
              </AppText>
            </View>
          )}
        </View>
        
        {/* Description Row */}
        <AppText variant="body" color={Colors.textSecondary} style={styles.compactDesc}>
          {request.description || request.aiSummary || 'No description provided'}
        </AppText>

        {/* Info Row: Photos, Location, Schedule */}
        <View style={styles.compactDetailsContainer}>
          {/* Photos Snippet */}
          {request.photos && request.photos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing['2'] }} style={{ marginBottom: Spacing['3'] }}>
              {request.photos.map((uri, idx) => (
                <Image key={idx} source={{ uri }} style={styles.compactPhoto} />
              ))}
            </ScrollView>
          ) : null}

          {/* Location & Date Snippet */}
          <View style={styles.compactMetaRow}>
            <MapPin size={16} color={Colors.textSecondary} />
            <AppText variant="bodySm" color={Colors.textSecondary} style={{ marginLeft: 6, flex: 1 }}>
              {request.location?.address || 'Current Location'}
            </AppText>
          </View>
          {request.scheduledDate && (
            <View style={[styles.compactMetaRow, { marginTop: Spacing['2'] }]}>
              <Calendar size={16} color={Colors.textSecondary} />
              <AppText variant="bodySm" color={Colors.textSecondary} style={{ marginLeft: 6, flex: 1 }}>
                {request.scheduledDate.toLocaleDateString()} at {request.scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </AppText>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Standard Expanded View
  return (
    <View style={styles.container}>
      {/* Photos Preview */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="h3" style={styles.sectionTitle}>Photos</AppText>
        </View>
        {request.photos && request.photos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoScroll}>
            {request.photos.map((uri, idx) => (
              <Image key={idx} source={{ uri }} style={styles.photo} />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.noPhoto}>
            <ImageIcon size={24} color={Colors.textTertiary} />
            <AppText variant="caption" style={{ color: Colors.textTertiary }}>No photos provided</AppText>
          </View>
        )}
      </View>

      {/* Details Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="h3" style={styles.sectionTitle}>Job Details</AppText>
          {showEditButtons && (
            <Pressable onPress={() => router.push('/new-request/issue-summary' as any)}>
              <Edit3 size={18} color={Colors.primary} />
            </Pressable>
          )}
        </View>
        <View style={styles.card}>
          <AppText variant="body" weight="semiBold" style={{ marginBottom: 4 }}>Problem Description</AppText>
          <AppText variant="body" style={styles.summaryText}>{request.description || request.aiSummary || 'Not provided'}</AppText>
          
          <View style={styles.chipRow}>
            {request.category && <Chip label={request.category} style={styles.chip} />}
            <Chip 
              label={request.urgency || 'Unspecified Urgency'} 
              selected 
              color={Colors.primary}
              style={styles.chip}
            />
          </View>

          {/* Schedule Info if applicable */}
          {request.scheduledDate && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}><Calendar size={16} color={Colors.cta} /></View>
              <AppText variant="body">{request.scheduledDate.toLocaleDateString()} at {request.scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</AppText>
            </View>
          )}
        </View>
      </View>

      {/* Replacement Parts Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="h3" style={styles.sectionTitle}>Replacement Parts</AppText>
        </View>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: request.partsDescription ? Spacing[2] : 0 }}>
            <Wrench size={16} color={request.hasParts ? Colors.success : Colors.warning} style={{ marginRight: Spacing[2] }} />
            <AppText variant="body" weight="semiBold">
              {request.hasParts ? 'Customer Has Parts' : 'Provider Will Bring Parts'}
            </AppText>
          </View>
          {request.hasParts && request.partsDescription ? (
            <View style={{ marginTop: Spacing[2] }}>
              <AppText variant="caption" color={Colors.textSecondary}>Parts Description</AppText>
              <AppText variant="body">{request.partsDescription}</AppText>
            </View>
          ) : null}
        </View>
      </View>

      {/* Location */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="h3" style={styles.sectionTitle}>Location</AppText>
        </View>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MapPin size={20} color={Colors.textSecondary} style={{ marginRight: Spacing[3] }} />
            <View style={{ flex: 1 }}>
              <AppText variant="body" weight="semiBold">Service Address</AppText>
              <AppText variant="caption" color={Colors.textSecondary}>
                {request.location?.address || 'Current Location'}
              </AppText>
            </View>
          </View>
        </View>
      </View>
      
      {/* Estimated Price Range */}
      {request.estimatedPriceRange && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText variant="h3" style={styles.sectionTitle}>Estimated Price Range</AppText>
          </View>
          <View style={styles.card}>
            <AppText variant="h4" weight="bold" color={Colors.cta}>{request.estimatedPriceRange}</AppText>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  
  // Compact Styles
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

  // Expanded Styles
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
