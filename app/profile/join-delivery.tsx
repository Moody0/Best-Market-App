import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  Image,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, Camera, User, Phone, Upload } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { ThemePalette } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useCustomAlert } from '@/contexts/CustomAlertContext';

export default function JoinDeliveryScreen() {
  const Colors = useAppTheme().colors;
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const { showAlert } = useCustomAlert();

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setAuth = useAuthStore(state => state.setAuth);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [avatar, setAvatar] = useState<any>(null);
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const pickAvatar = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setAvatar(result.assets[0]);
    }
  };

  const pickDocument = async () => {
    let result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
    });
    if (!result.canceled) {
      setDocument(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!firstName || !lastName || !phone || !document) {
      showAlert('خطأ', 'الرجاء تعبئة جميع الحقول الأساسية وإرفاق صورة الهوية.');
      return;
    }

    setLoading(true);
    try {
      const generatedPassword = phone + "@BM";
      
      const formData = new FormData();
      formData.append('first_name', firstName);
      formData.append('last_name', lastName);
      formData.append('phone', phone);
      formData.append('password', generatedPassword);
      formData.append('password_confirmation', generatedPassword);

      if (avatar) {
        formData.append('avatar', {
          uri: avatar.uri,
          type: avatar.mimeType || 'image/jpeg',
          name: avatar.fileName || 'avatar.jpg',
        } as any);
      }

      if (document) {
        formData.append('document', {
          uri: document.uri,
          type: document.mimeType || 'application/octet-stream',
          name: document.name || 'document.pdf',
        } as any);
      }

      const res = await api.post('/delivery/register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data?.token) {
        await setAuth(res.data.token, res.data.user);
        showAlert(
          'تم إنشاء الحساب بنجاح',
          'أهلاً بك في فريق توصيل بيست ماركت!',
          [{ text: 'متابعة', onPress: () => router.replace('/') }]
        );
      }
    } catch (err: any) {
      showAlert('خطأ', err.response?.data?.message || 'حدث خطأ أثناء إنشاء الحساب. تأكد من صحة البيانات وأن الرقم غير مستخدم مسبقاً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <ChevronRight color={Colors.textMuted} size={24} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>طلب انضمام كمندوب</Text>
              <Text style={styles.headerSub}>أدخل بياناتك وسيتم إنشاء حساب المندوب الخاص بك فوراً.</Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Profile Photo Upload */}
            <View style={styles.photoUploadContainer}>
              <TouchableOpacity style={styles.photoUploadCircle} onPress={pickAvatar}>
                {avatar ? (
                  <Image source={{ uri: avatar.uri }} style={styles.avatarPreview} />
                ) : (
                  <>
                    <Camera color={Colors.textMuted} size={28} />
                    <Text style={styles.photoUploadText}>صورة شخصية</Text>
                  </>
                )}
                {avatar && (
                  <View style={styles.uploadBadge}>
                    <Upload color="#fff" size={14} />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Name Row */}
            <View style={styles.row}>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.label}>الاسم الأول</Text>
                <View style={styles.inputWrapper}>
                  <User color={Colors.textMuted} size={18} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="أحمد"
                    placeholderTextColor={Colors.textMuted}
                    value={firstName}
                    onChangeText={setFirstName}
                    textAlign="right"
                  />
                </View>
              </View>

              <View style={styles.inputGroupHalf}>
                <Text style={styles.label}>اسم العائلة</Text>
                <View style={styles.inputWrapper}>
                  <User color={Colors.textMuted} size={18} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="محمد"
                    placeholderTextColor={Colors.textMuted}
                    value={lastName}
                    onChangeText={setLastName}
                    textAlign="right"
                  />
                </View>
              </View>
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>رقم الهاتف</Text>
              <View style={styles.inputWrapper}>
                <Phone color={Colors.textMuted} size={18} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="09..."
                  placeholderTextColor={Colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  textAlign="right"
                />
              </View>
            </View>

            {/* ID / License Upload */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>صورة الهوية أو رخصة القيادة</Text>
              <TouchableOpacity style={styles.fileInputWrapper} onPress={pickDocument}>
                <View style={styles.chooseFileBtn}>
                  <Text style={styles.chooseFileBtnText}>Choose File</Text>
                </View>
                <Text style={styles.fileInputPlaceholder} numberOfLines={1}>
                  {document ? document.name : 'No file chosen'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>إنشاء حساب مندوب</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (Colors: ThemePalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: 6,
    textAlign: 'left',
  },
  headerSub: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'left',
    lineHeight: 22,
  },
  photoUploadContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  photoUploadCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    position: 'relative',
  },
  avatarPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  uploadBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  photoUploadText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  inputGroupHalf: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'left',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.input,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    height: 50,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
    padding: 0,
    outlineStyle: 'none' as any,
  },
  inputIcon: {
    marginLeft: 12,
  },
  fileInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.input,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 50,
    overflow: 'hidden',
    paddingRight: 16,
  },
  fileInputPlaceholder: {
    flex: 1,
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'left',
    writingDirection: 'ltr',
    paddingHorizontal: 16,
  },
  chooseFileBtn: {
    backgroundColor: Colors.primaryLight, 
    height: '100%',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chooseFileBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
