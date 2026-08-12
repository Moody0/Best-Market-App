import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { ThemePalette } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

const steps = [
  { id: 1, label: 'السلة' },
  { id: 2, label: 'تفاصيل الطلب' },
  { id: 3, label: 'التأكيد' },
];

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {steps.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;

          return (
            <React.Fragment key={step.id}>
              {/* Connector line between steps */}
              {index > 0 && (
                <View
                  style={[
                    styles.connector,
                    step.id <= currentStep ? styles.connectorActive : styles.connectorInactive,
                  ]}
                />
              )}

              {/* Step Circle & Label */}
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.circle,
                    isCompleted && styles.circleCompleted,
                    isActive && styles.circleActive,
                    !isCompleted && !isActive && styles.circleInactive,
                  ]}
                >
                  {isCompleted ? (
                    <Check color="#fff" size={16} strokeWidth={3} />
                  ) : (
                    <Text
                      style={[
                        styles.circleText,
                        (isActive || isCompleted) && styles.circleTextActive,
                      ]}
                    >
                      {step.id}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.label,
                    isActive && styles.labelActive,
                    isCompleted && styles.labelCompleted,
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const getStyles = (Colors: ThemePalette) => StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: Colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stepsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    flexDirection: 'column',
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  circleActive: {
    backgroundColor: Colors.primary,
  },
  circleCompleted: {
    backgroundColor: Colors.success,
  },
  circleInactive: {
    backgroundColor: Colors.input,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  circleText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  circleTextActive: {
    color: '#FFFFFF',
  },
  label: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
    textAlign: 'center',
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  labelCompleted: {
    color: Colors.success,
    fontWeight: '600',
  },
  connector: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
    marginBottom: 20,
  },
  connectorActive: {
    backgroundColor: Colors.success,
  },
  connectorInactive: {
    backgroundColor: Colors.border,
  },
});
