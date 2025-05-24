// src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore'; // Import onSnapshot

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listener for authentication state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        // If user logs out, clear user data and set loading to false
        setUserData(null);
        setLoading(false);
      }
      // We set loading to false only after Firestore listener is setup or user is logged out
    });

    // Cleanup auth listener on unmount
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    let unsubscribeFirestore = null;

    if (currentUser) {
      setLoading(true); // Start loading when currentUser is available
      const userDocRef = doc(db, 'users', currentUser.uid);
      
      // Listener for Firestore document changes
      unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserData({ uid: currentUser.uid, ...docSnap.data() });
        } else {
          console.error("User document not found in Firestore for UID:", currentUser.uid);
          setUserData(null); // Or handle as appropriate
        }
        setLoading(false); // Stop loading once data is fetched/updated
      }, (error) => {
        console.error("Error listening to user document:", error);
        setUserData(null);
        setLoading(false); // Stop loading on error too
      });

    } else {
      // No user logged in, ensure loading is false if auth listener already ran
      if (!loading) setLoading(false);
    }

    // Cleanup Firestore listener on unmount or when currentUser changes
    return () => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, [currentUser]); // Re-run this effect when currentUser changes

  const value = {
    currentUser,
    userData,
    loading,
  };

  // Render children only when initial loading is complete
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

