import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronLeft, FileQuestion } from 'lucide-react-native';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/layout/Screen';
import {
  fetchPublishedContentPage,
  type ContentPageKey,
  type ContentPageViewModel,
} from '@/services/contentPages';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface PublishedContentPageProps {
  contentKey: ContentPageKey;
  fallbackTitle: string;
}

type PageState =
  | { status: 'loading'; page: null }
  | { status: 'ready'; page: ContentPageViewModel }
  | { status: 'unavailable'; page: null }
  | { status: 'error'; page: null };

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

export function PublishedContentPage({
  contentKey,
  fallbackTitle,
}: PublishedContentPageProps) {
  const router = useRouter();
  const [state, setState] = useState<PageState>({
    status: 'loading',
    page: null,
  });

  const load = useCallback(async () => {
    setState({ status: 'loading', page: null });
    try {
      const page = await fetchPublishedContentPage(contentKey);
      setState(
        page
          ? { status: 'ready', page }
          : { status: 'unavailable', page: null },
      );
    } catch {
      setState({ status: 'error', page: null });
    }
  }, [contentKey]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const title = state.page?.title ?? fallbackTitle;

  return (
    <Screen
      safeArea
      scrollable
      contentContainerStyle={styles.screenContent}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.replace('/(tabs)/profile')}
            accessibilityRole="button"
            accessibilityLabel="Back to profile"
            hitSlop={12}
            style={styles.backButton}
          >
            <ChevronLeft size={26} color={Colors.textPrimary} />
          </Pressable>
          <AppText variant="h3" weight="bold" style={styles.headerTitle}>
            {title}
          </AppText>
          <View style={styles.headerSpacer} />
        </View>

        {state.status === 'loading' && (
          <View
            style={styles.stateCard}
            accessibilityRole="progressbar"
            accessibilityLabel={`Loading ${fallbackTitle}`}
          >
            <ActivityIndicator size="large" color={Colors.primary} />
            <AppText variant="body" color={Colors.textSecondary}>
              Loading {fallbackTitle.toLowerCase()}…
            </AppText>
          </View>
        )}

        {state.status === 'unavailable' && (
          <View style={styles.stateCard}>
            <FileQuestion size={40} color={Colors.primary} />
            <AppText variant="h4" weight="bold" align="center">
              Page unavailable
            </AppText>
            <AppText
              variant="body"
              color={Colors.textSecondary}
              align="center"
            >
              This page is not currently published.
            </AppText>
          </View>
        )}

        {state.status === 'error' && (
          <View style={styles.stateCard}>
            <FileQuestion size={40} color={Colors.error} />
            <AppText variant="h4" weight="bold" align="center">
              Unable to load this page
            </AppText>
            <AppText
              variant="body"
              color={Colors.textSecondary}
              align="center"
            >
              Check your connection and try again.
            </AppText>
            <AppButton
              label="Retry"
              variant="outline"
              onPress={() => void load()}
              style={styles.retryButton}
            />
          </View>
        )}

        {state.status === 'ready' && (
          <View style={styles.contentCard}>
            <ContentBody body={state.page.body} />
            <View style={styles.metadata}>
              <AppText variant="caption" color={Colors.textTertiary}>
                Version {state.page.version}
              </AppText>
              {formatUpdatedAt(state.page.updatedAt) ? (
                <AppText variant="caption" color={Colors.textTertiary}>
                  Updated {formatUpdatedAt(state.page.updatedAt)}
                </AppText>
              ) : null}
            </View>
          </View>
        )}
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
  stateCard: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['4'],
    padding: Spacing['6'],
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
  },
  retryButton: {
    minWidth: 160,
  },
  contentCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    padding: Spacing['5'],
  },
  body: {
    gap: Spacing['3'],
  },
  sectionHeading: {
    marginTop: Spacing['3'],
  },
  paragraph: {
    lineHeight: 26,
  },
  metadata: {
    marginTop: Spacing['6'],
    paddingTop: Spacing['4'],
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing['1'],
  },
});
