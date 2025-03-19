import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Navigate, useRoutes } from "react-router-dom";
import Dashboard from "./Components/Dashboard";
import Auth from "./Components/Auth"; 
import Layout from "./Components/Layout";
import ExcelViewer from "./Components/ExcelViewer";
import Books from "./Components/Books";
import { GoogleOAuthProvider } from "@react-oauth/google"; 
import ProtectedRoute from "../src/protectedRoute/ProtectedRoute";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css";
import { WebSocketProvider } from "./context/WebSocketContext";

function App() {
  
  const [token, setToken] = useState(localStorage.getItem("token") || null);

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token"); 
    }
  }, [token]);

  const handleLogin = (newToken) => {
    setToken(newToken);
  };

  return (
    <GoogleOAuthProvider clientId="364205782321-tcdg1lfsn9psg8c6qft9pv1mlp9tv2j9.apps.googleusercontent.com"> 
      <WebSocketProvider>
      <Router>
        <div className="App">
        <ToastContainer />
          <AppRoutes token={token} handleLogin={handleLogin} />
        </div>
      </Router>
      </WebSocketProvider>
    </GoogleOAuthProvider>
  );
}

function AppRoutes({ token, handleLogin }) {
  const routes = [
    { path: "/", element: <Navigate to="/login" replace /> },
    { path: "/dashboard", element: <ProtectedRoute token={token}><Layout> <Dashboard /> </Layout></ProtectedRoute> },
    { path: "/excelviewer", element: <ProtectedRoute token={token}> <Layout> <ExcelViewer /> </Layout> </ProtectedRoute>},
    { path: "Books", element: <ProtectedRoute token={token}> <Layout> <Books /> </Layout> </ProtectedRoute>},
    { path: "/login", element: <Auth onLogin={handleLogin} /> },
    { path: "/signup", element: <Auth onLogin={handleLogin} /> },
    { path: "*", element: <Navigate to="/login" replace /> },
  ];

  return useRoutes(routes);
}

export default App;
