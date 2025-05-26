import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions"; // 👈 Ajouter l'import pour Functions

const firebaseConfig = {
  apiKey: "AIzaSyDFgmRQKx4M3Gr36ab9S9bxPXknawWb-Sc",
  authDomain: "planificateur-repas-familiaux.firebaseapp.com",
  projectId: "planificateur-repas-familiaux",
  storageBucket: "planificateur-repas-familiaux.firebasestorage.app",
  messagingSenderId: "1085846539126",
  appId: "1:1085846539126:web:6e377351bdf4a186b24857",
  measurementId: "G-7134J2SZSJ",
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Initialiser les services Firebase
const db = getFirestore(app);
const auth = getAuth(app);
const functions = getFunctions(app, "europe-west1"); // 👈 Initialiser Functions (adaptez la région si nécessaire)
const storage = getStorage(app); 

// Exporter les instances
export { app, db, auth, storage, functions }; // 👈 Exporter functions
// export const analytics = getAnalytics(app); // Si vous utilisez Google Analytics

