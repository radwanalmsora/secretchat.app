import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, addDoc, onSnapshot, query, orderBy, where, serverTimestamp, Timestamp, limit } from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  where, 
  serverTimestamp, 
  Timestamp,
  limit
};
