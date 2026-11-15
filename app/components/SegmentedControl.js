import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, font, shadow } from '../theme';

export default function SegmentedControl({ options, value, onChange, style }) {
  return (
    <View style={[styles.track, style]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <TouchableOpacity
            key={String(o.value)}
            style={[styles.segment, active && styles.segmentActive]}
            activeOpacity={0.8}
            onPress={() => onChange(o.value)}
          >
            <Text style={[styles.segText, active && styles.segTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: '#E6E9ED',
    borderRadius: radius.pill,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 5,
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  segmentActive: {
    backgroundColor: colors.surface,
    ...shadow.card,
    elevation: 1,
  },
  segText: { fontSize: font.sub, color: colors.chipText },
  segTextActive: { color: colors.primary, fontWeight: 'bold' },
});