import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDSt9TztujNmVNfQQtoTholPpMms6DODug",
  authDomain: "alleypondgolf.firebaseapp.com",
  projectId: "alleypondgolf",
  storageBucket: "alleypondgolf.firebasestorage.app",
  messagingSenderId: "77822390589",
  appId: "1:77822390589:web:e41257c6e61e89e57b1554",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
