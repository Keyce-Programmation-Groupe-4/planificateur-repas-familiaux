import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions"; // 👈 Ajouter l'import pour Functions
import { getMessaging } from "firebase/messaging"; // <<< ADD THIS

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

// Activer la persistance hors ligne
enableIndexedDbPersistence(db)
  .then(() => {
    console.log("Firestore offline persistence enabled successfully.");
  })
  .catch((err) => {
    if (err.code == "failed-precondition") {
      console.warn(
        "Firestore offline persistence failed: Multiple tabs open, persistence can only be enabled in one tab at a a time.",
      );
    } else if (err.code == "unimplemented") {
      console.warn(
        "Firestore offline persistence failed: The current browser does not support all of the features required to enable persistence.",
      );
    } else {
      console.error("Firestore offline persistence failed: ", err);
    }
  });

const auth = getAuth(app);
const functions = getFunctions(app, "europe-west1"); // 👈 Initialiser Functions (adaptez la région si nécessaire)
const storage = getStorage(app); 
const messaging = getMessaging(app); // <<< ADD THIS

// Exporter les instances
export { app, db, auth, storage, functions, messaging }; // <<< ADD messaging to exports
// export const analytics = getAnalytics(app); // Si vous utilisez Google Analytics
