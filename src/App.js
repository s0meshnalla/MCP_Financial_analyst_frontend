import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate,Outlet } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from "react";
import api from "./api/axios";
import { useAuth } from "./context/AuthContext";
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import SignupPage from './pages/SignUpPage';
import AddBalancePage from './pages/AddBalancePage';
import WelcomePage from './pages/WelcomePage';
import TransactionsPage from './pages/TransactionsPage';
import TradeExecutionPage from './pages/TradeExecutionPage';
import GraphsPage from './pages/GraphsPage';
import CreateProfilePage from './pages/CreateProfilePage';

function ProtectedRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function PublicRoute() {
  const { user } = useAuth();
  if (user) {
    if (user.isProfileCreated === false) {
      return <Navigate to="/create-profile" replace />;
    }
    return <Navigate to="/home" replace />;
  }
  return <Outlet />;
}


function App() {
  const { setAccessToken, setUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const didRefresh = useRef(false);
  const basename = useMemo(() => {
    if (!process.env.PUBLIC_URL) return "/";

    try {
      const url = new URL(process.env.PUBLIC_URL);
      const pathname = url.pathname.replace(/\/$/, "");
      return pathname || "/";
    } catch {
      return process.env.PUBLIC_URL;
    }
  }, []);

  useEffect(() => {
    if (didRefresh.current) return;
    didRefresh.current = true;

    api.post("/auth/refresh")
      .then(res => {
        setAccessToken(res.data.accessToken);
        setUser(res.data.user);
      })
      .catch((res) => {
        console.log('App auto-login failed',res);
        setTimeout(() =>
        logout()
        , 3000);
      })
      .finally(() => setLoading(false));
  }, [setAccessToken, setUser, logout]);

  if (loading) return null; // or spinner

  return (
    <Router basename={basename}>
      <Routes>
          <Route path="/" element={<WelcomePage />} />
        {/* Public routes */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/create-profile" element={<CreateProfilePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/add-balance" element={<AddBalancePage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/trade" element={<TradeExecutionPage />} />
          <Route path="/graphs" element={<GraphsPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </Router>
  );
}

export default App;