import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors, useThemedStyles, type Colors, radius, fontSize } from '@/design-system';

type Props = {
  /** Date de fin (timestamp en millisecondes). Le composant recalcule lui-même le temps restant. */
  until: number;
  tone?: 'dark' | 'primary';
};

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function remainingSeconds(until: number) {
  return Math.max(0, Math.floor((until - Date.now()) / 1000));
}

/**
 * Minuteur de vente flash HH:MM:SS.
 * Se base sur la date de fin (`until`) et non sur une durée figée :
 * le temps affiché reste juste même après un refetch ou un retour au premier plan.
 */
export function Countdown({ until, tone = 'dark' }: Props) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const [remaining, setRemaining] = useState(() => remainingSeconds(until));

  useEffect(() => {
    const tick = () => setRemaining(remainingSeconds(until));
    tick(); // resynchronise immédiatement si `until` change (refetch CMS)
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until]);

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const bg = tone === 'dark' ? colors.inverse : colors.primary;
  const fg = tone === 'dark' ? colors.textInverse : colors.textOnPrimary;

  return (
    <View style={styles.row}>
      {[pad(h), pad(m), pad(s)].map((val, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Text style={styles.colon}>:</Text>}
          <View style={[styles.box, { backgroundColor: bg }]}>
            <Text style={[styles.num, { color: fg }]}>{val}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  box: { borderRadius: radius.sm, paddingHorizontal: 5, paddingVertical: 3, minWidth: 24, alignItems: 'center' },
  num: { fontSize: fontSize.sm, fontWeight: '800' },
  colon: { color: colors.text, fontWeight: '800', marginHorizontal: 1 },
});
