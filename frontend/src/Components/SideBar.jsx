import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaSearch, FaBars, FaComments, FaBookOpen, FaHistory } from "react-icons/fa";
import { TbSquareToggle } from "react-icons/tb";
import { api } from "../api/api";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const fetchUploadHistory = async () => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("No token found. Please log in.");

    const { data } = await axios.get(`${api}/api/upload-history`, {
      headers: { Authorization: `Bearer ${token}` },
      withCredentials: true,
    });

    return data.uploads.reverse();
  };

  const { data: history = [], isLoading, error } = useQuery({
    queryKey: ["uploadHistory"],
    queryFn: fetchUploadHistory,
  });
  const filteredHistory = history.filter((item) =>
    item.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );
  console.log("filteredHistory", filteredHistory);
  
  if (isCollapsed) {
    return (
      <button
        className="p-2 bg-cyan-800 text-white fixed top-4 left-4 rounded-full z-20"
        onClick={() => setIsCollapsed(false)}
      >
        <FaBars />
      </button>
    );
  }

  return (
    <aside className="flex flex-col h-full p-4 bg-white w-64 shadow-md fixed left-0 top-0 bottom-0 z-20">
      <div className="flex items-center justify-between mb-4">
        {isSearchOpen ? (
          <input
            type="text"
            autoFocus
            placeholder="Search Books..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="p-1 border border-gray-300 rounded w-full"
            onBlur={() => setIsSearchOpen(false)}
          />
        ) : (
          <FaSearch
            size={30}
            className="text-cyan-600 cursor-pointer hover:bg-gray-200 rounded-full p-1"
            title="Search"
            onClick={() => setIsSearchOpen(true)}
          />
        )}

        <button
          onClick={() => setIsCollapsed(true)}
          className="text-cyan-600 hover:bg-gray-300 rounded p-1"
          title="Close Sidebar"
        >
          <TbSquareToggle size={30} />
        </button>
      </div>

      <button
        onClick={() => (window.location.href = "/dashboard")}
        className="mb-4 p-2 bg-cyan-500 text-white rounded flex items-center gap-2 hover:bg-cyan-600"
      >
        <FaComments /> New Chat
      </button>

      <h1 className="text-xl font-bold mb-2 flex items-center gap-2">
        <FaHistory /> Upload History
      </h1>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
        {isLoading ? (
          <p className="text-gray-500">Loading upload history...</p>
        ) : error ? (
          <p className="text-red-500">Error loading history.</p>
        ) : filteredHistory.length > 0 ? (
          filteredHistory.map((item, index) => (
            <div
              key={index}
              className="p-2 bg-gray-100 rounded mb-2 hover:bg-gray-200 cursor-pointer truncate"
              onClick={() => navigate("/excelViewer", { state: { structuredDataUrl: item.structuredDataUrl, book_id: item.book_id } })}
            >
              <a
                href={item.structuredDataUrl}
                rel="noopener noreferrer"
                className="block p-2 bg-gray-100 rounded mb-2 hover:bg-gray-200 cursor-pointer truncate"
              >
                {item.filename} - {new Date(item.upload_time).toLocaleString()}
              </a>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No upload history found.</p>
        )}
      </div>

      <button
        onClick={() => navigate("/books")}
        className="mt-auto p-2 bg-green-500 text-white rounded flex items-center gap-2 hover:bg-green-600"
      >
        <FaBookOpen /> Show All Books
      </button>
    </aside>
  );
};

export default Sidebar;
