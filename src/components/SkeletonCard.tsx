import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useColors, useThemedStyles, type Colors, radius, spacing, shadows } from '@/design-system';
import { Skeleton, SkeletonCircle } from './Skeleton';

type Props = {
  width?: number;
};

export function SkeletonCard({ width }: Props) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={[styles.card, width ? { width } : { flex: 1 }]}>
      <View style={styles.imageWrap}>
        <Skeleton width="100%" height="100%" borderRadius={radius.lg} style={StyleSheet.absoluteFill} />
      </View>
      <View style={styles.body}>
        <Skeleton width={50} height={18} borderRadius={radius.sm} />
        <Skeleton width="100%" height={14} />
        <Skeleton width="65%" height={14} />
        <Skeleton width={80} height={18} borderRadius={radius.sm} />
        <Skeleton width={60} height={12} />
        <Skeleton width={90} height={12} />
      </View>
    </View>
  );
}

export function SkeletonProductGrid() {
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, flex: 1 }}>
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}

export function SkeletonSearchResults() {
  return (
    <View style={{ flexDirection: 'row', padding: spacing.sm, gap: spacing.sm, flex: 1 }}>
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}

export function SkeletonStore() {
  const styles = useThemedStyles(makeStylesStore);

  return (
    <View style={styles.cont}>
      <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
        <Skeleton width="100%" height={44} borderRadius={radius.pill} />
      </View>
      <Skeleton width="100%" height={36} borderRadius={0} />
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={styles.sidebar}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width={80} height={16} style={{ marginVertical: 8, marginHorizontal: 8 }} />
          ))}
        </View>
        <View style={{ flex: 1, padding: spacing.md, gap: spacing.md }}>
          <Skeleton width={120} height={20} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={{ width: '30%' }}>
                <Skeleton width="100%" height={100} borderRadius={radius.md} />
                <Skeleton width="80%" height={12} style={{ marginTop: 6 }} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

export function SkeletonOrders() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.container}>
      <Skeleton width={160} height={22} style={{ margin: spacing.lg }} />
      <View style={{ flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.xl, paddingVertical: spacing.md }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} width={60} height={16} />
        ))}
      </View>
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Skeleton width={100} height={14} />
              <Skeleton width={60} height={14} />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
              <Skeleton width={72} height={72} borderRadius={radius.md} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="100%" height={14} />
                <Skeleton width="60%" height={14} />
                <Skeleton width={80} height={18} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function SkeletonProductDetail() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.container}>
      <Skeleton width="100%" height={400} borderRadius={0} />
      <View style={{ padding: spacing.lg, backgroundColor: colors.surface, gap: spacing.sm, marginTop: spacing.sm }}>
        <Skeleton width={150} height={28} />
        <Skeleton width={120} height={16} />
        <Skeleton width="100%" height={18} />
      </View>
      <View style={{ padding: spacing.lg, backgroundColor: colors.surface, gap: spacing.sm, marginTop: spacing.sm }}>
        <Skeleton width={80} height={16} />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Skeleton width={80} height={36} borderRadius={radius.md} />
          <Skeleton width={100} height={36} borderRadius={radius.md} />
        </View>
      </View>
      <View style={{ padding: spacing.lg, backgroundColor: colors.surface, gap: spacing.sm, marginTop: spacing.sm }}>
        <Skeleton width="100%" height={14} />
        <Skeleton width="90%" height={14} />
        <Skeleton width="75%" height={14} />
      </View>
    </View>
  );
}

export function SkeletonHorizontalRail() {
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm }}>
      {[1, 2, 3, 4].map((i) => (
        <SkeletonCard key={i} width={150} />
      ))}
    </View>
  );
}

export function SkeletonHome() {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.container}>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm, paddingVertical: spacing.md }}>
        <Skeleton width="100%" height={44} borderRadius={radius.pill} />
        <Skeleton width={120} height={14} />
      </View>
      <Skeleton width="100%" height={180} borderRadius={radius.lg} />
      <View style={styles.railCard}>
        <View style={{ flexDirection: 'row', gap: spacing.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonCircle key={i} size={54} />
          ))}
        </View>
      </View>
      <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
        <Skeleton width={160} height={20} />
      </View>
      <SkeletonHorizontalRail />
      <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
        <Skeleton width={200} height={20} />
      </View>
      <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm }}>
        <SkeletonCard />
        <SkeletonCard />
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, gap: spacing.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.background,
  },
  body: { padding: spacing.sm, gap: 6 },
  railCard: {
    backgroundColor: colors.surface,
    paddingBottom: spacing.xs,
  },
});

const makeStylesStore = (colors: Colors) => StyleSheet.create({
  cont: { flex: 1, backgroundColor: colors.surface },
  sidebar: {
    width: 104,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
});
