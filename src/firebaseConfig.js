import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage"; // 👈 Ajouter ceci

const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "", // 👈 CORRIGÉ : .app → .com
  messagingSenderId: "",
  appId: "",
  measurementId: "",
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
