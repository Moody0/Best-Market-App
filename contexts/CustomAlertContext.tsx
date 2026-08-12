import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertContextType {
  showAlert: (title: string, message?: string, buttons?: AlertButton[]) => void;
  hideAlert: () => void;
}

const CustomAlertContext = createContext<CustomAlertContextType | undefined>(undefined);

export const useCustomAlert = () => {
  const context = useContext(CustomAlertContext);
  if (!context) {
    throw new Error('useCustomAlert must be used within a CustomAlertProvider');
  }
  return context;
};

export const CustomAlertProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [buttons, setButtons] = useState<AlertButton[]>([]);
  const { colors } = useAppTheme();
  
  const fadeAnim = useState(new Animated.Value(0))[0];

  const showAlert = useCallback((newTitle: string, newMessage?: string, newButtons?: AlertButton[]) => {
    setTitle(newTitle);
    setMessage(newMessage || '');
    setButtons(newButtons || [{ text: 'موافق' }]);
    setVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const hideAlert = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
    });
  }, [fadeAnim]);

  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, []);

  const handleButtonPress = useCallback((btn: AlertButton) => {
    hideAlert();
    if (btn.onPress) {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      hideTimeout.current = setTimeout(() => {
        btn.onPress!();
      }, 200); // Wait for hide animation to complete
    }
  }, [hideAlert]);

  const contextValue = useMemo(() => ({ showAlert, hideAlert }), [showAlert, hideAlert]);

  return (
    <CustomAlertContext.Provider value={contextValue}>
      {children}
      
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
      >
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <View style={[styles.alertBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            {message ? <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text> : null}
            
            <View style={[styles.buttonContainer, { borderTopColor: colors.border }]}>
              {buttons.map((btn, index) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';
                const isPrimary = !isDestructive && !isCancel;
                
                let textColor = colors.text;
                if (isDestructive) textColor = colors.danger;
                if (isPrimary) textColor = colors.primary;

                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.button, index > 0 && { borderRightWidth: 1, borderRightColor: colors.border }]}
                    onPress={() => handleButtonPress(btn)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.buttonText, { color: textColor }, (isPrimary || isDestructive) && { fontWeight: '700' }]}>
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Animated.View>
      </Modal>
    </CustomAlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertBox: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row-reverse', // RTL flow
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
