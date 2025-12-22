// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Development fallback configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDemo-Key-For-Development-Only",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "refolio-demo.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "refolio-demo",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "refolio-demo.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:123456789012:web:abcdef123456789"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Log development mode
if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_FIREBASE_API_KEY) {
  console.log('🔧 Running in development mode with demo Firebase configuration');
  console.log('📝 To use real Firebase, add your credentials to .env file');
}

export { app, auth, db };
