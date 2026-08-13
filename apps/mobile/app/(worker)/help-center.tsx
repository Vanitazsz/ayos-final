import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/layout/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  fetchPublishedContentPage,
  type ContentPageViewModel,
} from '@/services/contentPages';
import { getBackRoute } from '@/constants/backRoutes';
import { useGoBack } from '@/hooks/useGoBack';

const HARDCODED_HELP_CENTER: ContentPageViewModel = {
  title: 'Help Center',
  body: `## Frequently Asked Questions

How do I receive service requests?
Set your status to Available for matching on your Profile tab, and make sure your Service Areas and Industry Skills are up to date.

How do payouts work?
Earnings from completed jobs are deposited directly to your selected payout method on record. You can view your balance and payout history under the Wallet tab.

What should I do if a customer cancels?
If a job is canceled after you accept, you will receive a notification. Check your Bookings tab for the updated status and details.

## Worker Support & Emergency

If you encounter any safety, technical, or account issues during a service call, contact our support team at support@ayos.ph or reach out through in-app messaging.`,
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

export default function WorkerHelpCenterScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const goBack = useGoBack('/(worker)/profile');
  const handleBack = () => {
    const route = getBackRoute(from);
    if (route) router.push(route);
    else goBack();
  };

  const [page, setPage] = useState<ContentPageViewModel>(HARDCODED_HELP_CENTER);

  const load = useCallback(async () => {
    try {
      const fetched = await fetchPublishedContentPage('HELP_CENTER');
      if (fetched) {
        setPage(fetched);
      }
    } catch {
      // Fallback to hardcoded help center on error
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
            <ChevronLeft size={26} color={Colors.textPrimary} />
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
