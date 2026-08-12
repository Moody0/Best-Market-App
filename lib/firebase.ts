import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import type { ConfirmationResult } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDP8gngjzG8hEsyNXnBfHtXdLrOGw4qgSI",
  authDomain: "best-market-sy.firebaseapp.com",
  projectId: "best-market-sy",
  storageBucket: "best-market-sy.firebasestorage.app",
  messagingSenderId: "267021137621",
  appId: "1:267021137621:web:2e829f863ba7d5f65b145c",
  measurementId: "G-LT9G6DG90E"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth with AsyncStorage persistence to fix the warning
let auth: ReturnType<typeof initializeAuth>;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (e) {
  // If it's already initialized (hot reload), just get it
  const { getAuth } = require('firebase/auth');
  auth = getAuth(app);
}

auth.languageCode = 'ar';

export { auth, RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup };
export const googleProvider = new GoogleAuthProvider();
export type { ConfirmationResult };
