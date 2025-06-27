"use client"

import { createContext, useEffect, useContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import { handleAuthStateChange, logoutUser } from "../redux/slices/authSlice";
import { auth } from "../firebaseConfig"; // db and onSnapshot are handled by the thunk

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const { currentUser, userData, loading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    // Dispatch the thunk that handles onAuthStateChanged and data fetching
    // The thunk itself will manage the listener lifecycle internally or return an unsubscribe if needed.
    // For onAuthStateChanged, it's often set up once and runs for the app's lifetime.
    // If handleAuthStateChange returned an unsubscribe function, you'd call it here.
    // const unsubscribe = dispatch(handleAuthStateChange());
    // return () => {
    //   if (unsubscribe && typeof unsubscribe === 'function') {
    //     unsubscribe();
    //   }
    // };
    dispatch(handleAuthStateChange());
  }, [dispatch]);

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap(); // unwrap to catch potential errors here
    } catch (e) {
      // Error is already handled in the slice's rejected case and stored in `error`
      console.error("Logout failed:", e);
    }
  };

  const value = {
    currentUser,
    userData,
    loading, // This now comes from Redux store, reflecting auth state and initial data load
    error, // Auth errors from Redux store
    logout: handleLogout, // Dispatch Redux action for logout
  };

  // Render children only when initial auth loading is complete
  // The definition of 'loading' in the slice (initialState.loading = true) covers this.
  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}

export { AuthProvider };
