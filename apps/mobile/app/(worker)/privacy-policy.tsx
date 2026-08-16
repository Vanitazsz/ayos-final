import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/layout/Screen';
import { Colors, Radius, Spacing, theme } from '@/constants/theme';
import {
  fetchPublishedContentPage,
  type ContentPageViewModel,
} from '@/services/contentPages';
import { getBackRoute } from '@/constants/backRoutes';
import { useGoBack } from '@/hooks/useGoBack';

const HARDCODED_PRIVACY_POLICY: ContentPageViewModel = {
  title: 'Privacy Policy',
  body: `## 1. Information We Collect

We collect worker profile details including your full name, contact information, identity verification documents, service areas, skills, and real-time location data necessary to match and fulfill service requests on the Ayos platform.

## 2. How We Use Worker Information

Your information is used to facilitate service request dispatching, verify worker eligibility, process earnings and payouts, communicate updates regarding your bookings, and maintain overall platform safety.

## 3. Location Tracking & Presence

When you turn on matching availability or accept an active booking, your device location is shared with the Ayos system and relevant customers to enable live dispatch, real-time arrival estimates, and service verification.

## 4. Data Protection & Security

We maintain administrative, technical, and physical safeguards designed to protect worker personal data and verification documents against unauthorized access, loss, or alteration.

## 5. Your Rights & Choices

You can review and update your profile details, service area preferences, or matching status at any time from your Profile screen. For account deletion requests or privacy inquiries, contact privacy@ayos.ph.`,
  version: '1.0.0',
  updatedAt: new Date().toISOString(),
};

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function ContentBody({ body }: { body: string }) {
  return (
    <View style={styles.body}>
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
              color={Colors.textSecondary}
              style={styles.paragraph}
            >
              {block}
            </AppText>
          ),
        )}
    </View>
  );
}

export default function WorkerPrivacyPolicyScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const goBack = useGoBack('/(worker)/profile');
  const handleBack = () => {
    const route = getBackRoute(from);
    if (route) router.push(route);
    else goBack();
  };

  const [page, setPage] = useState<ContentPageViewModel>(HARDCODED_PRIVACY_POLICY);

  const load = useCallback(async () => {
    try {
      const fetched = await fetchPublishedContentPage('PRIVACY');
      if (fetched) {
        setPage(fetched);
      }
    } catch {
      // Fallback to hardcoded privacy policy on error
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen
      scrollable
      keyboardAvoiding={false}
      contentContainerStyle={[styles.screenContent, { paddingBottom: 80 }]}
      style={{ paddingBottom: 0 }}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Back to profile"
            hitSlop={12}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </Pressable>
          <AppText variant="h3" weight="bold" style={styles.headerTitle}>
            {page.title}
          </AppText>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.contentCard}>
          <ContentBody body={page.body} />
          <View style={styles.metadata}>
            <AppText variant="caption" color={Colors.textTertiary}>
              Version {page.version}
            </AppText>
            {formatUpdatedAt(page.updatedAt) ? (
              <AppText variant="caption" color={Colors.textTertiary}>
                Updated {formatUpdatedAt(page.updatedAt)}
              </AppText>
            ) : null}
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: Spacing['8'],
  },
  container: {
    width: '100%',
    maxWidth: 840,
    alignSelf: 'center',
    flexGrow: 1,
    paddingHorizontal: theme.layout.screenPadding,
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing['4'],
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  contentCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    padding: Spacing['5'],
    flexGrow: 1,
  },
  body: {
    gap: Spacing['3'],
  },
  sectionHeading: {
    marginTop: Spacing['3'],
  },
  paragraph: {
    lineHeight: 24,
  },
  metadata: {
    marginTop: Spacing['6'],
    paddingTop: Spacing['4'],
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing['1'],
  },
});
