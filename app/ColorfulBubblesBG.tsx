import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');

const bubbles = [
  { size: 90, x: 0.1, y: 0.15, color: '#4F8EF7', opacity: 0.18 },
  { size: 60, x: 0.7, y: 0.12, color: '#1B6CA8', opacity: 0.13 },
  { size: 120, x: 0.8, y: 0.7, color: '#3A8DFF', opacity: 0.15 },
  { size: 70, x: 0.2, y: 0.8, color: '#5AC8FA', opacity: 0.12 },
  { size: 50, x: 0.5, y: 0.5, color: '#007AFF', opacity: 0.10 },
];

const ColorfulBubblesBG = () => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    {bubbles.map((b, i) => (
      <View
        key={i}
        style={[
          styles.bubble,
          {
            width: b.size,
            height: b.size,
            borderRadius: b.size / 2,
            backgroundColor: b.color,
            opacity: b.opacity,
            left: b.x * width,
            top: b.y * height,
          },
        ]}
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
  },
});

export default ColorfulBubblesBG;
