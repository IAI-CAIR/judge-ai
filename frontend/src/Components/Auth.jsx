import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";

import { api } from "../api/api";


function Auth({ onLogin }) {
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("test@gmail.com");
  const [password, setPassword] = useState("testtest");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [redirectMessage, setRedirectMessage] = useState("");

  const location = useLocation();
  useEffect(() => {
    if (location.state?.message) {
      toast.warn(location.state.message, {
        position: "top-right",
        autoClose: 3000, // Auto hide after 3 seconds
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "colored",
      });
    }
  }, [location.state]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (isSignup) {
        const response = await axios.post(`${api}/api/register`, {
          name,
          email,
          password,
        });

        if (response.data.access_token) {
          localStorage.setItem("token", response.data.access_token);
          localStorage.setItem("userProfile", JSON.stringify(response.data.userProfile));

          onLogin(response.data.access_token, response.data.userProfile);
          navigate("/dashboard");
        }
        setSuccess("Signup successful! Please log in.");
        setIsSignup(false);
      } else {
        const response = await axios.post(`${api}/api/login`, {
          email,
          password,
        });

        if (response.data.access_token) {
          localStorage.setItem("token", response.data.access_token);
          onLogin(response.data.access_token); // Pass the token to parent
          navigate("/dashboard"); // ✅ Navigate immediately after login
        } else {
          setError("Invalid login credentials");
        }
      }
    } catch (err) {
      console.log("error ", err);
      setError(err.response?.data?.message || (isSignup ? "Signup failed" : "Login failed"));
    }
  };

  // Handle Google Login Success
  const handleGoogleSuccess = async (response) => {
    try {
      const token = response.credential;
      const googleLoginResponse = await axios.post(`${api}/api/google-login`, { token });
      // console.log(googleLoginResponse.data.userProfile);
      // console.log(googleLoginResponse.data.userProfile.avatar)

      if (googleLoginResponse.data.access_token) {
        localStorage.setItem("token", googleLoginResponse.data.access_token);
        localStorage.setItem("userProfile", JSON.stringify(googleLoginResponse.data.userProfile));

        onLogin(googleLoginResponse.data.access_token, googleLoginResponse.data.userProfile);

        navigate(googleLoginResponse.data.redirect_url || "/dashboard");
      }
    } catch (error) {
      console.error("Google login failed:", error);

      setError("Google login failed");
    }
  };

  return (
    <div className="font-[sans-serif] bg-white flex items-center justify-center md:h-screen p-4">
      <div className="shadow-[0_2px_16px_-3px_rgba(6,81,237,0.3)] max-w-6xl max-md:max-w-lg rounded-md p-6">
        <div className="grid md:grid-cols-2 items-center gap-8">
          <div className="max-md:order-1">
            <img
              src="https://readymadeui.com/signin-image.webp"
              className="w-full aspect-[12/11] object-contain"
              alt="auth-image"
            />
          </div>

          <form onSubmit={handleAuth} className="md:max-w-md w-full mx-auto">
            <div className="mb-8 text-center">
              <ToastContainer
                className="w-[300px] sm:w-[450px]" // Adjust width
                toastClassName={() =>
                  "relative flex p-4 min-h-[60px] w-full rounded-lg shadow-lg bg-yellow-300 text-red-800"
                }
                bodyClassName="text-sm font-medium"
                progressClassName="bg-blue-900"
              />

              <h3 className="text-4xl font-bold text-blue-600">
                {isSignup ? "Sign Up" : "Sign In"}
              </h3>
            </div>

            {error && <p className="text-red-500 text-center mb-4">{error}</p>}
            {success && <p className="text-green-500 text-center mb-4">{success}</p>}

            {isSignup && (
              <div className="mb-6">
                <input
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full text-sm border-b border-gray-300 focus:border-blue-600 px-2 py-3 outline-none"
                  placeholder="Full Name"
                />
              </div>
            )}

            <div className="mb-6">
              <input
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full text-sm border-b border-gray-300 focus:border-blue-600 px-2 py-3 outline-none"
                placeholder="Enter Email"
              />
            </div>

            <div className="mb-6">
              <input
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full text-sm border-b border-gray-300 focus:border-blue-600 px-2 py-3 outline-none"
                placeholder="Enter Password"
              />
            </div>

            <div className="mt-8">
              <button
                type="submit"
                className="w-full shadow-xl py-2.5 px-4 text-sm font-semibold tracking-wide rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
              >
                {isSignup ? "Register" : "Sign In"}
              </button>
            </div>

            <div className="text-center mt-6">
              <p className="text-gray-800 text-sm">
                {isSignup ? "Already have an account?" : "Don't have an account?"}
                <button
                  type="button"
                  onClick={() => setIsSignup(!isSignup)}
                  className="text-blue-600 font-semibold hover:underline ml-1"
                >
                  {isSignup ? "Login here" : "Register here"}
                </button>
              </p>


              {/* Google OAuth Button */}
              <div className="text-center mt-4 ml-20">
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError("Google login failed")} />
              </div>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}

export default Auth;