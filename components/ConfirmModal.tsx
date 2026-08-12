import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export default function ConfirmModal({ 
  visible, 
  title, 
  message, 
  confirmText = 'تأكيد', 
  cancelText = 'إلغاء', 
  onConfirm, 
  onCancel,
  isDestructive = true
}: ConfirmModalProps) {
  const { colors } = useAppTheme();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
              
              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={[styles.btn, styles.cancelBtn]} 
                  onPress={onCancel}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.text }]}>{cancelText}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.btn, isDestructive ? { backgroundColor: colors.danger } : { backgroundColor: colors.primary }]} 
                  onPress={onConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmBtnText}>{confirmText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Cairo_700Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    fontFamily: 'Cairo_600SemiBold',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelBtnText: {
    fontSize: 15,
    fontFamily: 'Cairo_700Bold',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Cairo_700Bold',
  },
});
