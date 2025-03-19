import React, { useState, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { api } from "../api/api";
import { useNavigate } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import spinnerImage from "../assets/image.png";

const Dashboard = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  // 🔗 Access WebSocket Context
  const { progress, processedChunks, totalChunks, uploadingStarted, setUploadingStarted, socket, processingCompleted } = useWebSocket();

  const isPDF = (file) => {
    return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const uploadedFile = e.dataTransfer.files[0];
    if (uploadedFile && isPDF(uploadedFile)) {
      setFile(uploadedFile);
    } else {
      setFile(null);
      setToastMessage("Please upload a valid PDF file.");
      setToastType("error");
    }
  }, []);

  const handleFileInput = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile && isPDF(uploadedFile)) {
      setFile(uploadedFile);
    } else {
      toast.error("Please upload a valid PDF file.");
    }
  };

  const handleUpload = useMutation({
    mutationFn: async (file) => {
      if (!file) {
        toast.error("Please select a file before uploading.");
        return;
      }
      setUploading(true);
      setUploadingStarted(true);


      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication error. Please login again.");
        setUploadingStarted(false);
        return;
      }

      const formData = new FormData();
      formData.append("pdf", file);

      try {
        const response = await axios.post(`${api}/api/upload-pdf`, formData, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
          withCredentials: true,
        });

        if (response.data.book_id) {
          localStorage.setItem("bookId", response.data.book_id);
          console.log("Stored bookId:", response.data.book_id);
        }

        return response.data;
      } catch (error) {
        toast.error("Error uploading file. Please try again.");
        throw error;
      }
    },

    onSuccess: () => {
      toast.success("Upload successful!");
      setFile(null);
      setUploadingStarted(true);
    },

    onError: () => {
      setUploadingStarted(false);
    },
  });

  useEffect(() => {
    if (processingCompleted && processedChunks === totalChunks) {
      const storedBookId = localStorage.getItem("bookId"); 
      localStorage.setItem("latestBookId", storedBookId);
      console.log("Stored bookId:", storedBookId);
      localStorage.removeItem("progress");
      localStorage.removeItem("processedChunks");
      localStorage.removeItem("totalChunks");

      setTimeout(() => {
        console.log("✅ Processing completed! Navigating to /excelViewer with book_id:", storedBookId);

        navigate("/excelViewer", { state: { book_id: storedBookId } }); 

      }, 1000);
    }
  }, [processingCompleted, processedChunks, totalChunks, navigate]);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-1 justify-center items-center">
        <div className={`flex flex-col items-center p-6 ${uploadingStarted ? "pointer-events-none" : ""}`}>

          {/* ✅ Show Success Message Instead of Dropzone */}
          {uploadingStarted || processedChunks > 0 ? (
            // 🔄 Uploading Spinner & Progress Bar
            <div className="flex flex-col items-center justify-center border-2 border-blue-800 border-dashed rounded-lg bg-gray-200 bg-opacity-80 p-4"
              style={{ width: "800px", height: "400px" }}>

              {/* 🔄 Spinner */}
              <div className="relative flex justify-center items-center mb-4">
                <div className="animate-spin rounded-full bg-gray-100 h-30 w-30 border-t-4 border-b-4 border-blue-500"></div>
                <img src={spinnerImage} className="absolute rounded-full h-20 w-20" />
              </div>

              {/* 🔄 Progress Bar */}
              {processedChunks > 0 && (
                <>
                  <div className="w-3/4 bg-gray-400 rounded-lg overflow-hidden mt-6 mb-2">
                    <div
                      className="bg-blue-300 text-m leading-none py-2 text-center text-black rounded-lg transition-all duration-500"
                      style={{ width: `${totalChunks > 1 ? (processedChunks / totalChunks) * 100 : 0}%` }}
                    >
                      {totalChunks > 1
                        ? `${Math.round((processedChunks / totalChunks) * 100)}%`
                        : "Processing..."}
                    </div>
                  </div>

                  <motion.p
                    key={processedChunks}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="px-4 py-2 text-lg font-bold text-black bg-blue-300 border-t-4 border-r-4 border-blue-500 rounded-lg shadow-md"
                  >
                    Processing Chunks: {processedChunks}/{totalChunks}
                  </motion.p>
                </>
              )}
            </div>
          ) : (
            // 📂 File Dropzone
            <label
              htmlFor="dropzone-file"
              className="flex flex-col items-center justify-center w-full h-64 border-2 
              border-blue-800 border-dashed rounded-lg cursor-pointer bg-gray-200 hover:bg-gray-100"
              style={{ width: "800px", height: "400px" }}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg
                  className="w-8 h-8 mb-4 text-blue-500"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 20 16"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                  />
                </svg>
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-1000">Only PDF files are allowed</p>
                {file && <p className="text-xs text-gray-700 mt-2">Selected: {file.name}</p>}
              </div>
              <input
                id="dropzone-file"
                type="file"
                className="hidden"
                accept="application/pdf"
                onChange={handleFileInput}
                disabled={uploadingStarted}
              />
            </label>
          )}
          {/* Upload Button */}
          {file && !uploadingStarted && (
            <button
              onClick={() => handleUpload.mutate(file)}
              disabled={uploading}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          )}

        </div>
      </div>
    </div>
  );
}

export default Dashboard;
