import React, { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../config/firebaseconfig";
import { onAuthStateChanged } from "firebase/auth";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[AuthContext] useEffect: auth instance:", auth);
    let unsubscribe = null;
    if (auth && typeof auth.onAuthStateChanged === "function") {
      console.log("[AuthContext] onAuthStateChanged is a function, setting up listener");
      unsubscribe = auth.onAuthStateChanged((user) => {
        console.log("[AuthContext] onAuthStateChanged callback: user=", user);
        setUser(user);
        setLoading(false);
      });
    } else {
      console.error("[AuthContext] onAuthStateChanged is not a function on auth instance", auth);
      setLoading(false);
    }
    return () => {
      if (unsubscribe) {
        console.log("[AuthContext] Cleaning up onAuthStateChanged listener");
        unsubscribe();
      }
    };
  }, []);

  const value = {
    user,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
