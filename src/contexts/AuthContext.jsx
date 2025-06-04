"use client"

import { createContext, useState, useEffect, useContext } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth, db } from "../firebaseConfig"
import { doc, onSnapshot } from "firebase/firestore" // Import onSnapshot

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export default function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Listener for authentication state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      if (!user) {
        // If user logs out, clear user data and set loading to false
        setUserData(null)
        setLoading(false)
      }
      // We set loading to false only after Firestore listener is setup or user is logged out
    })

    // Cleanup auth listener on unmount
    return unsubscribeAuth
  }, [])

  useEffect(() => {
    let unsubscribeFirestore = null;

    if (currentUser) {
      setLoading(true);
      const vendorDocRef = doc(db, "vendors", currentUser.uid);

      unsubscribeFirestore = onSnapshot(vendorDocRef,
        (vendorDocSnap) => {
          if (vendorDocSnap.exists()) {
            // User is a vendor
            const vendorData = vendorDocSnap.data();
            setUserData({
              uid: currentUser.uid,
              email: currentUser.email, // From auth
              ...vendorData,             // Data from Firestore vendors collection
              isVendor: true,
              vendorId: currentUser.uid, // Explicitly set for clarity
            });
            setLoading(false);
          } else {
            // User is not a vendor, try to fetch as a regular user from "users" collection
            const userDocRef = doc(db, "users", currentUser.uid);
            // Need a nested unsubscribe or manage it carefully.
            // For simplicity here, we'll create a new unsubscribe for the user path.
            // The outer unsubscribeFirestore will be overwritten.
            // A more robust solution might involve a function that returns the correct unsubscribe.
            const unsubscribeUserDoc = onSnapshot(userDocRef,
              (userDocSnap) => {
                if (userDocSnap.exists()) {
                  setUserData({
                    uid: currentUser.uid,
                    email: currentUser.email,
                    ...userDocSnap.data(),
                    isVendor: false
                  });
                } else {
                  // No specific user document, just basic auth info
                  console.log("User document not found in 'users' for UID:", currentUser.uid, "- setting basic profile.");
                  setUserData({
                    uid: currentUser.uid,
                    email: currentUser.email,
                    isVendor: false
                  });
                }
                setLoading(false);
              },
              (userError) => {
                console.error("Error listening to user document:", userError);
                setUserData({
                  uid: currentUser.uid,
                  email: currentUser.email,
                  isVendor: false,
                  error: "Failed to load user profile"
                }); // Basic info on error
                setLoading(false);
              }
            );
            // This ensures the userDoc listener is the one being returned for cleanup if we went down this path
            unsubscribeFirestore = unsubscribeUserDoc;
          }
        },
        (vendorError) => {
          console.error("Error listening to vendor document, attempting to fetch as regular user:", vendorError);
          // Fallback to fetching as a regular user from "users" collection
          const userDocRef = doc(db, "users", currentUser.uid);
          const unsubscribeUserDocOnError = onSnapshot(userDocRef,
            (userDocSnap) => {
              if (userDocSnap.exists()) {
                setUserData({
                  uid: currentUser.uid,
                  email: currentUser.email,
                  ...userDocSnap.data(),
                  isVendor: false
                });
              } else {
                console.log("User document also not found in 'users' after vendor fetch error for UID:", currentUser.uid);
                setUserData({
                  uid: currentUser.uid,
                  email: currentUser.email,
                  isVendor: false
                });
              }
              setLoading(false);
            },
            (userError) => {
              console.error("Error listening to user document after vendor error:", userError);
              setUserData({
                uid: currentUser.uid,
                email: currentUser.email,
                isVendor: false,
                error: "Failed to load any user profile"
              });
              setLoading(false);
            }
          );
          unsubscribeFirestore = unsubscribeUserDocOnError;
        }
      );
    } else {
      // No user logged in (already handled by the first useEffect for clearing userData)
      // if (!loading) setLoading(false); // This check might be redundant due to the first useEffect
    }

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
  }

  // Render children only when initial loading is complete
  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
}

export { AuthProvider }
