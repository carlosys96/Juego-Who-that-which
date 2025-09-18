'use client';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "studio-6115963591-9307f",
  appId: "1:580812551129:web:53e487b5ec94beadd75fc8",
  storageBucket: "studio-6115963591-9307f.firebasestorage.app",
  apiKey: "AIzaSyDWWyH8UKMaHoMQ1IGCCDPM3q6ehumhuUQ",
  authDomain: "studio-6115963591-9307f.firebaseapp.com",
  messagingSenderId: "580812551129",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
