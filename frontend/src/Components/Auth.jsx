import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google"; // Import GoogleLogin
import { api } from "../api/api";
import { register, signin } from "../utility/helper";
import { useSocket } from "../utility/Auth";


export default function Auth({ onLogin }) {
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("test@gmail.com");
  const [password, setPassword] = useState("testtest");
  const [success, setSuccess] = useState("");
  const { login, error, setError } = useSocket();
  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (isSignup) {
        register({ email, password, name })
          .then((data) => {
            if (data && data.error) {
              console.log(data.error);
            } else {
              navigate("/login");
              setSuccess("Signup successful! Please log in.");
              setIsSignup(false);
            }
          })
          .catch((err) => {
            console.log("Error in Sign up", err);
          });

        // if (response.data.access_token) {
        //   localStorage.setItem("token", response.data.access_token);
        //   localStorage.setItem("userProfile", JSON.stringify(response.data.userProfile));

        //   onLogin(response.data.access_token, response.data.userProfile);
        //   navigate("/dashboard");
        // }
      } else {
        signin({ email, password })
          .then((data) => {
            if (data && data.error) {
              setError("Invalid login credentials");
            } else {
              login(data);
              onLogin(data.access_token);
              navigate("/dashboard");
            }
          }
          )
          .catch((err) => console.log("Signin request failed", err));
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
              <h3 className="text-4xl font-bold text-cyan-600">
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
                  className="w-full text-sm border-b border-gray-300 focus:border-cyan-600 px-2 py-3 outline-none"
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
                className="w-full text-sm border-b border-gray-300 focus:border-cyan-600 px-2 py-3 outline-none"
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
                className="w-full text-sm border-b border-gray-300 focus:border-cyan-600 px-2 py-3 outline-none"
                placeholder="Enter Password"
              />
            </div>

            <div className="mt-8">
              <button
                type="submit"
                className="w-full shadow-xl py-2.5 px-4 text-sm font-semibold tracking-wide rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none"
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
                  className="text-cyan-600 font-semibold hover:underline ml-1"
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
