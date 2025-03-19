import React, { useState, useCallback, useEffect, useRef } from "react";
import axios from "axios";
import { api } from "../api/api";
import { useNavigate } from "react-router-dom"
import { io } from "socket.io-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import spinnerImage from "../assets/image.png";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


const Dashboard = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState("");
  const navigate = useNavigate();
  const [progress, setProgress] = useState();
  const socketRef = useRef(null);
  const [uploadingStarted, setUploadingStarted] = useState(false);
  const [processedChunks, setProcessedChunks] = useState(0);
  const [totalChunks, setTotalChunks] = useState(1);
  const queryClient = useQueryClient();
  const [toastTimestamp, setToastTimestamp] = useState(Date.now());
  const [uploadStatus, setUploadStatus] = useState();
  const [successMessage, setSuccessMessage] = useState("");
  const [processingCompletedMessage, setProcessingCompletedMessage] = useState("");
  


  useEffect(() => {
    if (toastMessage) {
      if (toastType === "success") {
        toast.success(toastMessage, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "colored"
        });
      } else if (toastType === "error") {
        toast.error(toastMessage, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "colored",
        });
      }

      setToastMessage(null);
    }
  }, [toastMessage, toastType]);

  useEffect(() => {
    const savedBookId = localStorage.getItem("book_id");
    const savedProgress = localStorage.getItem("progress");
    const savedProcessedChunks = localStorage.getItem("processedChunks");
    const savedTotalChunks = localStorage.getItem("totalChunks");
    const savedUploadingStarted = localStorage.getItem("uploadingStarted");

    console.log("Uploading Started State:", savedUploadingStarted);
    console.log("Restoring from localStorage:");
    console.log("Book ID:", savedBookId);
    console.log("Progress:", savedProgress);
    console.log("Processed Chunks:", savedProcessedChunks);
    console.log("Total Chunks:", savedTotalChunks);


    if (savedProgress) setProgress(savedProgress);
    if (savedProcessedChunks && savedTotalChunks) {
      setProcessedChunks(parseInt(savedProcessedChunks, 10));
      setTotalChunks(parseInt(savedTotalChunks, 10));
    }

    if (savedUploadingStarted !== null) {
      setUploadingStarted(savedUploadingStarted === "true");
    } else {
      setUploadingStarted(false);
    }

    if (savedBookId && socketRef.current) {
      console.log("Restoring processing for book_id:", savedBookId);
      setTimeout(() => {
        socketRef.current.emit("start_process", { book_id: savedBookId });
      }, 1000);
    }
  }, []);


  useEffect(() => {
    if (!socketRef.current) {
      setProgress("Connecting to Server...");
      socketRef.current = io(api, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
      });

      // ✅ Connection success
      socketRef.current.on("connect", () => {
        setProgress("Connected to Server ✅");
        console.log("Connected to the server ✅");
        setToastMessage("Connected to the server ✅");
        setToastType("success");
      });
      socketRef.current.on("reconnect", (attempt) => {
        console.log(`Reconnected after ${attempt} attempts`);
        setProgress("Reconnected to server ✅");

        // Try resuming processing
        const savedBookId = localStorage.getItem("book_id");
        if (savedBookId) {
          console.log("Resuming process for book_id:", savedBookId);
          socketRef.current.emit("start_process", { book_id: savedBookId });
        }
      });

      // ❌ Connection error
      socketRef.current.on("connect_error", (error) => {
        console.error("Server connection failed ❌. Retrying...");
        setProgress("Server connection failed. Retrying... 🔄");
        setToastMessage("Server connection failed. Retrying...");
        setToastType("error");
      });

      // ✅ Progress updates
      socketRef.current.on("progress_update", (data) => {
        if (data.message) {
          setProgress(data.message);
          localStorage.setItem("progress", data.message); // ✅ Store progress in localStorage

          const match = data.message.match(/Processing chunk (\d+)\/(\d+)/);
          if (match) {
            const processed = parseInt(match[1], 10);
            const total = parseInt(match[2], 10);
            setProcessedChunks(processed);
            setTotalChunks(total);

            localStorage.setItem("processedChunks", processed); // ✅ Store chunks progress
            localStorage.setItem("totalChunks", total);
          }
        }
      });

      // ✅ Upload status updates
      socketRef.current.on("upload_status", (data) => {
        if (data.message) {
          console.log("Upload status update", data.message);
          localStorage.setItem("progress", data.message);
          toast.success(data.message, {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: "colored",
          });
        }
      });

      // ✅ Completed process
      socketRef.current.on("completed", () => {
        setProgress("Processing completed! 🎉");
        setToastMessage("Processing completed! 🎉");
        setToastType("success");
        // setIsProcessingComplete(true);
        localStorage.setItem("progress", "Processing completed! 🎉");

        // Reset upload state after completion
        setUploadingStarted(false);
        // localStorage.removeItem("uploadingStarted");
      });


      // ❌ Error Handling
      socketRef.current.on("error", (error) => {
        console.error("WebSocket error:", error);
        const errorMessage = error?.message || "Unknown error occurred";
        setProgress(`Error occurred: ${errorMessage}`);
        setToastMessage(`Error: ${errorMessage}`);
        setToastType("error");
        localStorage.setItem("progress", `Error: ${errorMessage}`);
        localStorage.removeItem("uploadingStarted");
      });
    }

    // ✅ Cleanup function to prevent duplicate connections
    return () => {
      if (socketRef.current) {
        socketRef.current.off("progress_update");
        socketRef.current.off("upload_status");
        socketRef.current.off("completed");
        socketRef.current.off("error");
        socketRef.current.off("connect");
        socketRef.current.off("connect_error");

        socketRef.current.disconnect();
        socketRef.current = null;


      }
    };
  }, []);


  useEffect(() => {
    if (processedChunks > 0 && processedChunks === totalChunks && uploadingStarted) {
      setUploadingStarted(false); // Hide spinner & progress bar
      localStorage.setItem("uploadingStarted", "false");
      setProcessingCompletedMessage("PDF processed successfully! Redirecting to Excel Viewer...");
      setTimeout(() => {
        localStorage.removeItem("progress");
        localStorage.removeItem("processedChunks");
        localStorage.removeItem("totalChunks");
        localStorage.removeItem("uploadingStarted");
        localStorage.removeItem("book_id");
        console.log("localStorage cleared, navigating to /excelViewer...");
        navigate(`/excelViewer?book_id=${bookId}`);
      }, 1000);
    }
  }, [processedChunks, totalChunks, uploadingStarted, navigate]);

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
      setFile(null);
      setToastMessage("Please upload a valid PDF file.");
      setToastType("error");
    }
  };

  const handleUpload = useMutation({
    mutationFn: async (file) => {
      if (!file) {
        setToastMessage("Please select a file before uploading.");
        setToastType("error");
        return;
      }
      setUploading(true);
      setUploadingStarted(true);

      const token = localStorage.getItem("token");
      if (!token) {
        setToastMessage("Authentication error. Please login again.");
        setToastType("error");
        setUploading(false);
        return;
      }
      const formData = new FormData();

      formData.append("pdf", file);
      try {
        const response = await axios.post(`${api}/api/upload-pdf`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        });
        if (response.data.book_id) {
          localStorage.setItem("book_id", response.data.book_id); // ✅ Store book_id
          console.log("Stored book_id:", response.data.book_id);
        }

        return response.data;
      } catch (error) {
        setToastMessage("Error uploading file. Please try again.");
        setToastType("error");
        console.error("Error uploading file:", error);
        throw error;
      }
    },

    onSuccess: (data) => {
      const bookId = data?.book_id;
      if (bookId) {
        localStorage.setItem("book_id", bookId);
      }

      if (socketRef.current && bookId) {
        console.log("Resuming process for book_id:", bookId);
        socketRef.current.emit("start_process", { book_id: bookId });
      } else {
        console.error("WebSocket not connected ❌");
      }

      setToastMessage("Upload successful!");
      setToastType("success");
      setFile(null);
      queryClient.invalidateQueries(["uploadedFiles"]);
      setUploading(false);

      localStorage.setItem("uploadingStarted", "true");
      setUploadingStarted(true);

    },

    onError: (error) => {
      setToastMessage(error.message || "Error uploading file.");
      setToastType("error");
      setUploading(false);
      setUploadingStarted(false);
      // localStorage.removeItem("uploadingStarted"); // ❌ Clear upload state on failure
    },
  });
  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-1 justify-center items-center">
        <div className={`flex flex-col items-center p-6 ${uploadingStarted ? "pointer-events-none" : ""}`}>

          {/* ✅ Show Success Message Instead of Dropzone */}
          {processingCompletedMessage ? (
            <div className="flex items-center justify-center w-full h-64 border-2 border-blue-800 border-dashed rounded-lg bg-gray-200"
              style={{ width: "800px", height: "400px" }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="flex items-center justify-center w-full h-64 rounded-lg relative overflow-hidden shadow-lg animate-gradient"
                style={{ width: "800px", height: "400px" }}
              >
                {/* 🔹 Animated Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

                {/* 🔹 Glowing Border */}
                <div className="absolute inset-0 border-4 border-transparent rounded-lg animate-border-glow" />

                {/* 🔹 Success Message with Animated Text */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="text-white text-xl font-bold relative z-10 drop-shadow-lg"
                >
                  🎉 {processingCompletedMessage} 🎉
                </motion.p>
              </motion.div>

            </div>
          ) : uploadingStarted || processedChunks > 0 ? (
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
