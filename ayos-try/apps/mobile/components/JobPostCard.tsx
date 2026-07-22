import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  TextInput,
  Keyboard,
} from 'react-native';
import { MapPin, DollarSign, MessageCircle, Share2, Send } from 'lucide-react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { Chip } from './Chip';
import type { JobOpportunity, JobComment } from '@/services/api';

interface JobPostCardProps {
  job: JobOpportunity;
  comments: JobComment[];
  sortNewest: boolean;
  onToggleSort: () => void;
  onComment: (jobId: string, text: string, offerMin: string, offerMax: string) => void;
  onShare: (jobId: string) => void;
}

export const JobPostCard: React.FC<JobPostCardProps> = ({
  job,
  comments,
  sortNewest,
  onToggleSort,
  onComment,
  onShare,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [offerMin, setOfferMin] = useState('');
  const [offerMax, setOfferMax] = useState('');

  const sortedComments = useMemo(() => {
    const sorted = [...comments];
    sorted.sort((a, b) => {
      if (sortNewest) return 0;
      return 1;
    });
    return sorted;
  }, [comments, sortNewest]);

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    onComment(job.id, commentText.trim(), offerMin, offerMax);
    setCommentText('');
    setOfferMin('');
    setOfferMax('');
    Keyboard.dismiss();
  };

  return (
    <View style={styles.card}>
      {/* Author Header */}
      <View style={styles.header}>
        <Avatar uri={job.customerAvatar} size={44} />
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <AppText variant="body" weight="semiBold" color={Colors.textPrimary}>
              {job.customerName}
            </AppText>
            {job.urgency === 'urgent' && (
              <Badge label="Urgent" variant="error" size="sm" />
            )}
          </View>
          <AppText variant="caption" color={Colors.textTertiary}>
            {job.postedTime}
          </AppText>
        </View>
      </View>

      {/* Service Title */}
      <AppText variant="body" weight="bold" color={Colors.primary} style={styles.serviceTitle}>
        {job.service}
      </AppText>

      {/* Description */}
      <AppText variant="body" color={Colors.textSecondary} style={styles.description}>
        {job.description}
      </AppText>

      {/* Image Preview */}
      {job.imageUrl && (
        <Image source={{ uri: job.imageUrl }} style={styles.postImage} resizeMode="cover" />
      )}

      {/* Meta Row */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MapPin size={14} color={Colors.textTertiary} />
          <AppText variant="caption" color={Colors.textSecondary}>
            {job.distance} away
          </AppText>
        </View>
        <View style={styles.metaItem}>
          <DollarSign size={14} color={Colors.textTertiary} />
          <AppText variant="caption" weight="semiBold" color={Colors.textPrimary}>
            {job.offeredPrice}
          </AppText>
        </View>
      </View>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <Pressable
          style={styles.actionButton}
          onPress={() => setExpanded(!expanded)}
        >
          <MessageCircle size={18} color={expanded ? Colors.primary : Colors.textTertiary} />
          <AppText
            variant="caption"
            weight={expanded ? 'semiBold' : 'regular'}
            color={expanded ? Colors.primary : Colors.textTertiary}
          >
            Comment ({job.commentCount})
          </AppText>
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => onShare(job.id)}
        >
          <Share2 size={18} color={Colors.textTertiary} />
          <AppText variant="caption" color={Colors.textTertiary}>
            Share
          </AppText>
        </Pressable>
      </View>

      {/* Comments Section */}
      {expanded && (
        <View style={styles.commentsSection}>
          <View style={styles.commentsDivider} />

          {/* Sort Filter */}
          <Pressable style={styles.sortRow} onPress={onToggleSort}>
            <AppText variant="caption" color={Colors.textTertiary}>
              {sortedComments.length} comment{sortedComments.length !== 1 ? 's' : ''}
            </AppText>
            <AppText variant="caption" weight="semiBold" color={Colors.info}>
              {sortNewest ? 'Newest' : 'Oldest'} ▼
            </AppText>
          </Pressable>

          {/* Comment Input */}
          <View style={styles.commentInputSection}>
            <TextInput
              style={styles.commentInput}
              placeholder="Describe your offer..."
              placeholderTextColor={Colors.textTertiary}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.offerRow}>
              <View style={styles.offerInputWrapper}>
                <AppText variant="caption" color={Colors.textTertiary}>Min ($)</AppText>
                <TextInput
                  style={styles.offerInput}
                  placeholder="50"
                  placeholderTextColor={Colors.textTertiary}
                  value={offerMin}
                  onChangeText={setOfferMin}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.offerInputWrapper}>
                <AppText variant="caption" color={Colors.textTertiary}>Max ($)</AppText>
                <TextInput
                  style={styles.offerInput}
                  placeholder="80"
                  placeholderTextColor={Colors.textTertiary}
                  value={offerMax}
                  onChangeText={setOfferMax}
                  keyboardType="number-pad"
                />
              </View>
              <Pressable
                style={[styles.postButton, !commentText.trim() && styles.postButtonDisabled]}
                onPress={handleSubmitComment}
                disabled={!commentText.trim()}
              >
                <Send size={16} color={Colors.white} />
              </Pressable>
            </View>
          </View>

          {/* Comments List */}
          {sortedComments.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <View style={styles.commentHeader}>
                <Avatar uri={comment.avatarUri} size={32} />
                <View style={styles.commentAuthorInfo}>
                  <AppText variant="caption" weight="semiBold" color={Colors.textPrimary}>
                    {comment.author}
                  </AppText>
                  <AppText variant="caption" color={Colors.textTertiary}>
                    {comment.postedTime}
                  </AppText>
                </View>
              </View>
              <AppText variant="bodySm" color={Colors.textSecondary} style={styles.commentText}>
                {comment.text}
              </AppText>
              {comment.offerMin && comment.offerMax && (
                <View style={styles.offerBadge}>
                  <DollarSign size={12} color={Colors.success} />
                  <AppText variant="caption" weight="semiBold" color={Colors.success}>
                    Offer: {comment.offerMin} - {comment.offerMax}
                  </AppText>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing['4'],
    marginBottom: Spacing['3'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing['3'],
  },
  headerInfo: {
    flex: 1,
    marginLeft: Spacing['3'],
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  serviceTitle: {
    marginBottom: Spacing['2'],
  },
  description: {
    marginBottom: Spacing['3'],
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.lg,
    marginBottom: Spacing['3'],
    backgroundColor: Colors.border,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing['3'],
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['1'],
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing['3'],
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  commentsSection: {
    marginTop: Spacing['3'],
  },
  commentsDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginBottom: Spacing['3'],
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing['3'],
  },
  commentInputSection: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing['3'],
    marginBottom: Spacing['3'],
  },
  commentInput: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textPrimary,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: Spacing['2'],
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing['2'],
  },
  offerInputWrapper: {
    flex: 1,
    gap: Spacing['1'],
  },
  offerInput: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing['3'],
    paddingVertical: Spacing['2'],
  },
  postButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postButtonDisabled: {
    opacity: 0.4,
  },
  commentCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing['3'],
    marginBottom: Spacing['2'],
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing['2'],
  },
  commentAuthorInfo: {
    flex: 1,
    marginLeft: Spacing['2'],
    gap: 2,
  },
  commentText: {
    lineHeight: 20,
    marginBottom: Spacing['2'],
  },
  offerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['1'],
    backgroundColor: Colors.successBg,
    paddingHorizontal: Spacing['3'],
    paddingVertical: Spacing['2'],
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
});
