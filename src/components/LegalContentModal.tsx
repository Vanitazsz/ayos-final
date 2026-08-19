import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { theme } from '@/constants/theme';
import {
  fetchPublishedContentPage,
  type ContentPageKey,
  type ContentPageViewModel,
} from '@/services/contentPages';

export interface LegalContentModalProps {
  visible: boolean;
  type: ContentPageKey | null;
  onClose: () => void;
}

const FALLBACK_LEGAL_PAGES: Record<
  'TERMS' | 'PRIVACY',
  { title: string; body: string }
> = {
  TERMS: {
    title: 'Terms of Service',
    body: `## 1. Who We Are

A-YOS connects homeowners and customers with independent service professionals for home maintenance, repair, and related tasks. A-YOS facilitates request matching, scheduling, communication, and payment processing.

## 2. Account Registration & Use

You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.

## 3. Service Bookings & Agreements

When a customer confirms a booking with a service provider, a binding service agreement is formed directly between the customer and the worker. A-YOS facilitates platform features but is not a direct party to the service contract.

## 4. Payments & Cancellation

All payments must be processed through the A-YOS platform workflows. Cancellations and refund requests are handled in accordance with platform cancellation policies.

## 5. Prohibited Conduct

Users agree not to misuse the platform, provide false information, harass other users, or attempt to conduct off-platform payments to circumvent platform safety and guarantees.

## 6. Liability & Service Updates

A-YOS provides the platform "as is" and limits liability to the maximum extent permitted by applicable law. We may update these terms periodically to reflect service improvements.`,
  },
  PRIVACY: {
    title: 'Privacy Policy',
    body: `## 1. Information We Collect

We collect personal information you provide when creating an account, submitting service requests, or registering as a worker (including name, email address, mobile number, service address, and verification details).

## 2. How We Use Information

Your information is used to match service requests, verify user and worker identities, facilitate in-app communication, process payments, and ensure overall platform safety and reliability.

## 3. Location Tracking & Data

For active service requests and worker availability matching, location data may be processed to calculate distances, provide arrival estimates, and enable real-time tracking during active bookings.

## 4. Data Protection & Safeguards

We implement administrative, technical, and physical safeguards designed to protect personal data against unauthorized access, loss, or misuse. We do not sell your personal data to third parties.

## 5. Your Rights & Choices

You can review, update, or request deletion of your personal information at any time from your profile settings or by contacting privacy@ayos.ph.`,
  },
};

function ContentBody({ body }: { body: string }) {
  return (
    <View style={styles.bodyContainer}>
      {body
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block, index) =>
          block.startsWith('## ') ? (
            <AppText
              key={`${index}-${block}`}
              variant="h4"
              weight="bold"
              style={styles.sectionHeading}
            >
              {block.slice(3).trim()}
            </AppText>
          ) : (
            <AppText
              key={`${index}-${block}`}
              variant="body"
              color={theme.colors.textSecondary}
              style={styles.paragraph}
            >
              {block}
            </AppText>
          ),
        )}
    </View>
  );
}

export function LegalContentModal({
  visible,
  type,
  onClose,
}: LegalContentModalProps) {
  const insets = useSafeAreaInsets();
  const [pageData, setPageData] = useState<ContentPageViewModel | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadContent() {
      if (!type || !visible) {
        setPageData(null);
        return;
      }
      try {
        const fetched = await fetchPublishedContentPage(type);
        if (isMounted) {
          setPageData(fetched);
        }
      } catch (err) {
        console.warn('[LegalContentModal] Error fetching content:', err);
      }
    }
    loadContent();
    return () => {
      isMounted = false;
    };
  }, [type, visible]);

  if (!visible || !type) return null;

  const fallback =
    type === 'TERMS' ? FALLBACK_LEGAL_PAGES.TERMS : FALLBACK_LEGAL_PAGES.PRIVACY;
  const title = pageData?.title ?? fallback.title;
  const body = pageData?.body ?? fallback.body;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View entering={SlideInDown} style={styles.container}>
          <View style={styles.header}>
            <AppText variant="h3" weight="bold" style={styles.headerTitle}>
              {title}
            </AppText>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
            >
              <X size={20} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            <ContentBody body={body} />
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <AppButton
              label="I Understand"
              variant="primary"
              size="md"
              fullWidth
              onPress={onClose}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: '85%',
    minHeight: '50%',
    width: '100%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
  },
  closeButton: {
    padding: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.borderLight,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  bodyContainer: {
    gap: 12,
  },
  sectionHeading: {
    marginTop: 12,
    marginBottom: 4,
    color: theme.colors.textPrimary,
  },
  paragraph: {
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
});
