import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ token, children }) => {
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ message: "Access denied! Please log in to continue." }} />;
  }

  return children;
};

export default ProtectedRoute;
