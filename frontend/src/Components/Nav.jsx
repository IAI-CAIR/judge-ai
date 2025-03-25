import React, { useState, useEffect } from "react";
import { FaUserCircle } from "react-icons/fa";
import axios from "axios";
import UserProfileModal from "./UserProfileModel";
import {api} from "../api/api";

const NavBar = () => {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await axios.get(`${api}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });

        setUserProfile(response.data);
        localStorage.setItem("userProfile", JSON.stringify(response.data)); // Store in localStorage
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();
  }, []);

  const openProfileModal = () => {
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
  };

  const avatar = userProfile?.avatar;
  const showInitials = !avatar; // Only show initials if no avatar is provided



  const name = userProfile?.name || "User";
  const initials = name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase())
    .join(""); // Get first letter of first name and surname

  return (
    <header className="w-full p-4 pt-0 flex justify-between items-center">
      <img
        src="../src/assets/logo.png"
        alt="Graphiti Multimedia"
        className="h-14 w-auto object-contain"
      />
       <div
          onClick={openProfileModal}
          className="cursor-pointer flex justify-center items-center"
        >
          {showInitials ? (
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-cyan-600 text-white">
              {initials}
            </div>
          ) : (
            <img
              src={avatar}
              alt="Profile"
              className="w-8 h-8 rounded-full border-2 border-cyan-600 object-cover"
            />
          )}
        </div>


      {isProfileModalOpen && (
        <UserProfileModal userProfile={userProfile} closeProfileModal={closeProfileModal} />
      )}
    </header>
  );
};

export default NavBar;
