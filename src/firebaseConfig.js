import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage"; // 👈 Ajouter ceci

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
const storage = getStorage(app); // 👈 Ajouter ceci

// Exporter les instances
export { app, db, auth, storage };
// export const analytics = getAnalytics(app); // Si vous utilisez Google Analytics
