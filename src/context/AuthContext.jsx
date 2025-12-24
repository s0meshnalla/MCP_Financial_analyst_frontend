import { createContext, useContext, useState, useCallback } from "react";
import { setAccessToken as setApiAccessToken } from "../api/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const setAccessToken = useCallback((token) => {
    setApiAccessToken(token); // sets axios interceptor memory token
  }, []);

  const logout = useCallback(() => {
    setApiAccessToken(null);
    setUser(null);
  }, [setUser]);

  return (
    <AuthContext.Provider value={{ user, setUser, setAccessToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
