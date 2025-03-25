import { useState, useEffect } from "react";
import { BrowserRouter as Router, Navigate, useRoutes } from "react-router-dom";
import Dashboard from "./Components/Dashboard";
import Auth from "./Components/Auth";
import Layout from "./Components/Layout";
import ExcelViewer from "./Components/ExcelViewer";
import Books from "./Components/Books";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { SocketProvider } from "./utility/Auth";
import PrivateRoute from "./utility/PrivateRoutes";
import { Chat } from "./Components/Chat";

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
      <SocketProvider>
        <Router>
          <div className="App">
            <AppRoutes token={token} handleLogin={handleLogin} />
          </div>
        </Router>
      </SocketProvider>
    </GoogleOAuthProvider>
  );
}

function AppRoutes({ handleLogin }) {
  const routes = [
    { path: "/", element: <Navigate to="/login" replace /> },
    { path: "/dashboard", element: <PrivateRoute><Layout>  <Dashboard /> </Layout> </PrivateRoute> },
    { path: "/excelviewer", element: <PrivateRoute> <Layout> <ExcelViewer /> </Layout></PrivateRoute> },
    { path: "Books", element: <Layout> <Books /> </Layout> },
    { path: "/login", element: <Auth onLogin={handleLogin} /> },
    { path: "/signup", element: <Auth onLogin={handleLogin} /> },
    { path: "*", element: <Navigate to="/login" replace /> },
    { path: "/chat", element: <PrivateRoute> <Layout> <Chat /> </Layout></PrivateRoute> },
  ];

  return useRoutes(routes);
}

export default App;
