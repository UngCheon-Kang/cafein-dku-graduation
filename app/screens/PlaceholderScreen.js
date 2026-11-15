import { View, Text, StyleSheet } from 'react-native';

// label을 받아서 화면 가운데에 표시하는 임시 화면
export default function PlaceholderScreen({ label }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{label} 화면 (준비 중)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    color: '#888',
  },
});