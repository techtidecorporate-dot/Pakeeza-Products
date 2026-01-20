import React, { useEffect, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    Image,
    StyleSheet,
    View
} from 'react-native';

const { width, height } = Dimensions.get('window');

const WORDS = [
  'Premium Beauty',
  'Pakeeza Products',
  'Natural Ingredients',
  'Luxury Skincare',
  'Hair Care Solutions',
  'Radiant Skin',
  'Pure Beauty',
];

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const opacity = new Animated.Value(0);
  const [loadingWidth, setLoadingWidth] = useState(0);
  const scale = new Animated.Value(0.8);
  const rotate = new Animated.Value(0);
  const translateY = new Animated.Value(30);

  useEffect(() => {
    // Logo animation
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 1200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(rotate, {
          toValue: 1,
          duration: 15000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
    ]).start();
    // Animate loading bar width using setInterval
    let progress = 0;
    const loadingInterval = setInterval(() => {
      progress += 0.02;
      setLoadingWidth(Math.min(progress, 1));
      if (progress >= 1) clearInterval(loadingInterval);
    }, 24);

    // Word rotation animation
    const wordInterval = setInterval(() => {
      setCurrentWordIndex(prev => (prev + 1) % WORDS.length);
    }, 800);

    // Wait, then call onFinish
    const timer = setTimeout(() => {
      clearInterval(wordInterval);
      clearInterval(loadingInterval);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        })
      ]).start(() => onFinish());
    }, 3500);

    return () => {
      clearTimeout(timer);
      clearInterval(wordInterval);
      clearInterval(loadingInterval);
    };
  }, []);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={styles.container}>
      {/* Animated background elements */}
      <View style={styles.backgroundCircles}>
        <Animated.View style={[styles.circle, styles.circle1, {
          transform: [{ rotate: rotateInterpolate }]
        }]} />
        <Animated.View style={[styles.circle, styles.circle2, {
          transform: [{ rotate: rotate.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '-360deg']
          }) }]
        }]} />
      </View>

      {/* Main content */}
      <View style={styles.content}>
        <Animated.View style={{
          opacity,
          transform: [{ scale }, { translateY }]
        }}>
          <View style={styles.logoContainer}>
            <Image
              source={{ uri: 'https://placehold.co/120x120/6A0F49/FFFFFF?text=PP' }}
              style={styles.logo}
            />
            <Animated.View style={[styles.logoGlow, {
              transform: [{ scale: scale.interpolate({
                inputRange: [0.8, 1],
                outputRange: [0.8, 1.2]
              }) }]
            }]} />
          </View>
        </Animated.View>

        <View style={styles.textContainer}>
          <Animated.Text 
            style={[styles.brandText, { opacity }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            Pakeeza Products
          </Animated.Text>
          
          <View style={styles.wordContainer}>
            <Animated.Text 
              style={[styles.taglineText, { opacity }]}
              key={currentWordIndex}
            >
              {WORDS[currentWordIndex]}
            </Animated.Text>
          </View>
        </View>
      </View>

      {/* Footer with loading indicator */}
      <View style={styles.footer}>
        <Animated.View style={[styles.loadingBar, { opacity }]}> 
          <View style={[styles.loadingProgress, {
            width: loadingWidth * width * 0.6
          }]} />
        </Animated.View>
        <Animated.Text style={[styles.footerText, { opacity }]}>
          Premium Beauty Solutions
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  backgroundCircles: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    borderRadius: width,
    opacity: 0.1,
  },
  circle1: {
    width: width * 1.2,
    height: width * 1.2,
    borderWidth: 15,
    borderColor: '#6A0F49',
  },
  circle2: {
    width: width,
    height: width,
    borderWidth: 10,
    borderColor: '#D4AF37',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    zIndex: 2,
  },
  logoGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(106, 15, 73, 0.2)',
    zIndex: 1,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  brandText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6A0F49',
    letterSpacing: 2,
    marginBottom: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  wordContainer: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taglineText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#D4AF37',
    textAlign: 'center',
    letterSpacing: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    width: '100%',
  },
  loadingBar: {
    width: width * 0.6,
    height: 4,
    backgroundColor: '#EEE',
    borderRadius: 2,
    marginBottom: 15,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: '#6A0F49',
    borderRadius: 2,
  },
  footerText: {
    fontSize: 14,
    color: '#888',
    letterSpacing: 0.5,
  },
});