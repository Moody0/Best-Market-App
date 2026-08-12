import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';

interface TypewriterProps {
  words: string[];
  onCycleStart?: () => void;
}

function AnimatedWord({ word, wordIndex, visibleCount }: { word: string, wordIndex: number, visibleCount: any }) {
  const wordStyle = useAnimatedStyle(() => {
    const isVisible = visibleCount.value > wordIndex;
    return {
      opacity: withTiming(isVisible ? 1 : 0, { duration: 250 }),
      transform: [{
        translateY: withTiming(isVisible ? 0 : 4, { duration: 250, easing: Easing.out(Easing.back(1.5)) })
      }]
    };
  });

  return (
    <Animated.Text style={[styles.placeholder, wordStyle]}>
      {word}{' '}
    </Animated.Text>
  );
}

function AnimatedPhrase({ phrase, visibleCount }: { phrase: string, visibleCount: any }) {
  const words = `ابحث عن ${phrase}`.split(' ');

  return (
    <View style={{ flexDirection: 'row' }}>
      {words.map((word, i) => (
        <AnimatedWord key={`${phrase}-${i}`} word={word} wordIndex={i} visibleCount={visibleCount} />
      ))}
    </View>
  );
}

export default React.memo(function TypewriterPlaceholder({ words = [], onCycleStart }: TypewriterProps) {
  const [activeIdx, setActiveIdx] = React.useState(0);
  const visibleCount = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    if (!words || words.length === 0) return;

    let timeoutIds: ReturnType<typeof setTimeout>[] = [];
    let currentIdx = activeIdx;

    const runCycle = () => {
      const currentCategory = words[currentIdx];
      if (!currentCategory) return;
      
      const phraseLen = `ابحث عن ${currentCategory}`.split(' ').length;
      
      visibleCount.value = withTiming(phraseLen, { duration: phraseLen * 200, easing: Easing.linear });
      
      const t1 = setTimeout(() => {
        containerOpacity.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
        if (onCycleStart) onCycleStart();
        
        const t2 = setTimeout(() => {
          currentIdx = (currentIdx + 1) % words.length;
          setActiveIdx(currentIdx);
          visibleCount.value = 0; 
          
          const t3 = setTimeout(() => {
            containerOpacity.value = 1;
          }, 300);
          timeoutIds.push(t3);
        }, 300);
        timeoutIds.push(t2);
      }, phraseLen * 200 + 1500);
      timeoutIds.push(t1);
    };

    runCycle();
    const interval = setInterval(() => {
      timeoutIds.forEach(clearTimeout);
      timeoutIds = [];
      runCycle();
    }, 4000);
    
    return () => {
      clearInterval(interval);
      timeoutIds.forEach(clearTimeout);
    };
  }, [words]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    flexDirection: 'row',
  }));

  if (!words || words.length === 0) {
    return <Text style={styles.placeholder}>ابحث عن منتج...</Text>;
  }

  const currentPhrase = words[activeIdx] || words[0];

  return (
    <Animated.View style={containerStyle}>
      <AnimatedPhrase phrase={currentPhrase} visibleCount={visibleCount} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  placeholder: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
});
