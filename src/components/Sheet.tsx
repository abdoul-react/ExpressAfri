import React, { useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, useThemedStyles, type Colors, spacing, radius, typography } from '@/design-system';
import { Icon, IconName } from '@/icons';

export type SheetHandle = {
  present: () => void;
  dismiss: () => void;
};

type Props = {
  snapPoints?: (string | number)[];
  title?: string;
  icon?: IconName;
  children: React.ReactNode;
  onDismiss?: () => void;
};

export const Sheet = forwardRef<SheetHandle, Props>(
  ({ snapPoints = ['50%', '90%'], title, icon, children, onDismiss }, ref) => {
    const sheetRef = useRef<BottomSheetModal>(null);
    const insets = useSafeAreaInsets();
    const colors = useColors();
    const styles = useThemedStyles(makeStyles);

    useImperativeHandle(ref, () => ({
      present: () => sheetRef.current?.present(),
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    const renderBackdrop = useCallback(
      (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
          pressBehavior="close"
        />
      ),
      []
    );

    return (
      <BottomSheetModal
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        onDismiss={onDismiss}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.borderStrong, width: 36 }}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
          showsVerticalScrollIndicator={false}
        >
          {title ? (
            <View style={styles.header}>
              {icon ? <Icon name={icon} size={20} color={colors.text} /> : null}
              <Text style={styles.title}>{title}</Text>
            </View>
          ) : null}
          <View style={styles.content}>{children}</View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);

Sheet.displayName = 'Sheet';

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.xxl,
      paddingBottom: spacing.md,
    },
    title: {
      ...typography.title,
      color: colors.text,
      flex: 1,
    },
    content: {
      paddingHorizontal: spacing.xxl,
    },
  });
