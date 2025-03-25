import React, { useState, useEffect } from "react";
import { FaUser, FaCog, FaTimes, FaSignOutAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const UserProfileModal = ({ userProfile: initialUserProfile, closeProfileModal }) => {
  const [userProfile, setUserProfile] = useState(initialUserProfile);
  const [activeTab, setActiveTab] = useState("details");
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const navigate = useNavigate();

  // Load user profile from localStorage if not provided as a prop
  useEffect(() => {
    if (!initialUserProfile) {
      const storedProfile = localStorage.getItem("userProfile");

      if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile);
        console.log("Loaded Profile from Storage:", userProfile);
        // setUserProfile(JSON.parse(storedProfile));
        setUserProfile(parsedProfile)
      }
    }
  }, [initialUserProfile]);

  // Apply theme when the modal mounts or theme changes
  useEffect(() => {
    document.body.classList.remove("light-theme", "dark-theme");
    document.body.classList.add(`${theme}-theme`);
  }, [theme]);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };
  

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userProfile");
    closeProfileModal();
    navigate("/Login");
  };

  if (!userProfile) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <p className="text-center">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-80 bg-white rounded-lg shadow-xl p-4 opacity-100 transition-all">
      <div className="relative">
        <button
          onClick={closeProfileModal}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          <FaTimes size={20} />
        </button>

      <div className="flex flex-col items-center mb-4">
        <img
          src={userProfile?.avatar || `https://ui-avatars.com/api/?name=${userProfile?.name || "User"}&size=128`} 
          alt={userProfile?.name || "User Avatar"}
          className="w-16 h-16 rounded-full mb-2 border-2 border-cyan-500"
        />


          <h2 className="text-lg font-bold text-gray-800">{userProfile.name || "Unnamed User"}</h2>
          <p className="text-sm text-gray-600">{userProfile.email || "No Email Provided"}</p>
        </div>

        <div className="flex mb-4">
          <button
            onClick={() => setActiveTab("details")}
            className={`flex-1 py-2 px-4 text-center ${
              activeTab === "details" ? "bg-cyan-500 text-white" : "bg-gray-200"
            }`}
          >
            <FaUser className="inline-block mr-2" />
            Details
          </button>
          <button
            onClick={() => setActiveTab("preferences")}
            className={`flex-1 py-2 px-4 text-center ${
              activeTab === "preferences" ? "bg-cyan-500 text-white" : "bg-gray-200"
            }`}
          >
            <FaCog className="inline-block mr-2" />
            Preferences
          </button>
        </div>

        {activeTab === "preferences" && (
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Theme</label>
              <select
                value={theme}
                onChange={(e) => handleThemeChange(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notifications</label>
              <div className="mt-1 flex items-center">
                <input type="checkbox" className="h-4 w-4 text-cyan-600 border-gray-300 rounded" />
                <label className="ml-2 text-sm text-gray-900">Receive email notifications</label>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-100 px-4 py-2 flex justify-between mt-4">
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white py-1 px-3 rounded-md flex items-center text-sm"
          >
            <FaSignOutAlt className="mr-2" /> Logout
          </button>
          <button
            onClick={closeProfileModal}
            className="bg-cyan-500 text-white py-1 px-3 rounded-md text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
