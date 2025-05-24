// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics"; // Décommentez si vous utilisez Analytics
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// IMPORTANT : Remplacez ceci par la configuration de VOTRE projet Firebase !
const firebaseConfig = {
  apiKey: "AIzaSyDFgmRQKx4M3Gr36ab9S9bxPXknawWb-Sc",
  authDomain: "planificateur-repas-familiaux.firebaseapp.com",
  projectId: "planificateur-repas-familiaux",
  storageBucket: "planificateur-repas-familiaux.firebasestorage.app",
  messagingSenderId: "1085846539126",
  appId: "1:1085846539126:web:6e377351bdf4a186b24857",
  measurementId: "G-7134J2SZSJ"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Initialiser les services Firebase que nous utiliserons
const db = getFirestore(app);
const auth = getAuth(app);
// const analytics = getAnalytics(app); // Décommentez si vous utilisez Analytics

// Exporter les instances pour les utiliser dans l'application
export { app, db, auth };
