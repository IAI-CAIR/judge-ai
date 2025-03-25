import React, { useState, useCallback, useEffect, useRef } from "react";
import axios from "axios";
import { api } from "../api/api";
import { useNavigate } from "react-router-dom"
import { io } from "socket.io-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const Dashboard = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState("");
  const navigate = useNavigate();
  const [progress, setProgress] = useState("Waiting for Upload....");
  const socketRef = useRef(null);
  const [uploadingStarted, setUploadingStarted] = useState(false);
  const [processedChunks, setProcessedChunks] = useState(0);
  const [totalChunks, setTotalChunks] = useState(1);
  const [modelStatus, setModelStatus] = useState("");
  const queryClient = useQueryClient();
  const [progressSteps, setProgressSteps] = useState([]);


  useEffect(() => {

    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [toastMessage]);


  useEffect(() => {

    if (!socketRef.current) {
      setProgress("Connecting to Server...");

      socketRef.current = io(api, {
        transports: ["websocket"],  //"polling"
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socketRef.current.on("connect", () => {
        setProgress("Connected to WebSocket ✅");
        setToastMessage("Connected to the server ✅");
        setToastType("success");
      });

      socketRef.current.on("connect_error", (error) => {
        console.error("WebSocket connection failed ❌. Retrying...");
        setProgress("Server connection failed. Retrying... 🔄");
        setToastMessage("Server connection failed. Retrying...");
        setToastType("error");
      });

      socketRef.current.on("progress_update", (data) => {
        console.log("Received update:", data);

        if (data.message) {

          // Handle Model Connection Status
          
          const match = data.message.match(/Processing chunk (\d+)\/(\d+)/);
          if (match) {
            const processed = parseInt(match[1], 10);
            const total = parseInt(match[2], 10);
            setProcessedChunks(processed);
            setTotalChunks(total);
          }
        }
      });

      socketRef.current.on("upload_status", (data) => {
        console.log("Received update:", data);

        setToastType("success");
      });
      socketRef.current.on("completed", () => {
        console.log("Processing completed! 🎉");
        setProgress("Processing completed! 🎉");

      });


      socketRef.current.on("error", (error) => {
        console.error("WebSocket error:", error);
        setProgress("Error occurred: " + error.message);
        setToastMessage("Error: " + error.message);
        setToastType("error");
      });
    }


    return () => {
      if (socketRef.current) {
        socketRef.current.off("progress_update");
        socketRef.current.off("upload_status");
        socketRef.current.off("completed");
        socketRef.current.off("error");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [api]);

  // useEffect(() => {
  //   if (processedChunks > 0 && processedChunks === totalChunks) {
  //     console.log("All chunks processed! Navigating to Excel Viewer...");
  //     navigate("/excelViewer");
  //   }
  // }, [processedChunks, totalChunks, navigate]);
  useEffect(() => {
    if (processedChunks > 0 && processedChunks === totalChunks) {
      console.log("All chunks processed! Navigating to Excel Viewer...");
      navigate("/excelViewer");
    }
  }, [processedChunks, totalChunks, navigate]);


  const handleUploadStatus = (data) => {
    console.log("WebSocket Event Received:", data);
    setToastMessage(data.message);
    setToastType("info");
  };

  const isPDF = (file) => {
    return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const uploadedFile = e.dataTransfer.files[0];
    if (uploadedFile && isPDF(uploadedFile)) {
      setFile(uploadedFile);
      setToastMessage(null);
    } else {
      setToastMessage("Please upload a valid PDF file.");
      setToastType("error");
    }
  }, []);

  const handleFileInput = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile && isPDF(uploadedFile)) {
      setFile(uploadedFile);
      setToastMessage(null);
    } else {
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
      setToastMessage(null);

      const token = localStorage.getItem("token");
      if (!token) {
        setToastMessage("Authentication error. Please login again.");
        setToastType("error");
        setUploadingStarted(false);
        return;
      }
      const formData = new FormData();
      formData.append("pdf", file);
      setUploading(true);
      setToastMessage(null);
      return axios.post(`${api}/api/upload-pdf`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true,
      });
    },
    onSuccess: () => {
      console.log("File uploaded successfully ✅");
      if (socketRef.current) {
        console.log("Emitting WebSocket event: start_process ✅");
        socketRef.current.emit("start_process");
      } else {
        console.error("WebSocket is not connected ❌");
      }

      setToastMessage("Upload successful!");
      setToastType("success");
      setFile(null);
      queryClient.invalidateQueries(["uploadedFiles"]);
    },
    onError: (error) => {
      setToastMessage("Error uploading file. Please try again.");
      setToastType("error");
      console.error("Error uploading file:", error);
      setUploadingStarted(false);
    },
  });
  return (
    <div className="flex flex-col h-screen">
      {/* Toast Notification */}
      {/* {toastMessage && (
        <div className="fixed top-16 right-4 w-max space-y-2">
          <div
            className={`bg-white shadow-md border-t-4 ${toastType === "success" ? "border-green-500" : "border-red-500"
              } text-gray-800 flex items-center max-w-sm p-4 rounded-md`}
            role="alert"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-5 h-5 mr-3 ${toastType === "success" ? "fill-green-500" : "fill-red-500"
                }`}
              viewBox="0 0 20 20"
            >
              {toastType === "success" ? (
                <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm-1 15l-5-5 1.41-1.41L9 11.17l5.59-5.58L16 7l-7 8z" />
              ) : (
                <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9V9h2v6zm0-8H9V5h2v2z" />
              )}
            </svg>
            <span className="text-sm font-semibold">{toastMessage}</span>
          </div>
        </div>
      )} */}

      <div className="flex flex-1 justify-center items-center">
        <div className={`flex flex-col items-center p-6 ${uploadingStarted ? "pointer-events-none" : ""}`}>
          {uploadingStarted ? (
            // 🔹 Overlay appears when uploading starts
            <div className="flex flex-col items-center justify-center bg-gray-200 bg-opacity-80 p-4 rounded-lg"
              style={{ width: "800px", height: "400px" }}>

              {/* Spinner */}
              <div className="relative flex justify-center items-center mb-4">
                <div className="animate-spin rounded-full bg-gray-100 h-30 w-30 border-t-4 border-b-4 border-blue-500"></div>
                <img src="../src/assets/image.png" className="absolute rounded-full h-20 w-20" />
              </div>

              {/* Progress Bar */}
              <div className="w-3/4 bg-gray-400 rounded-lg overflow-hidden mt-6 mb-2">
                <div
                  className="bg-blue-700 text-m leading-none py-2 text-center text-black rounded-lg transition-all duration-500"
                  style={{ width: `${totalChunks > 1 ? (processedChunks / totalChunks) * 100 : 0}% ` }}
                >
                  {totalChunks > 1
                    ? `${Math.round((processedChunks / totalChunks) * 100)}%`
                    : "Starting..."}
                </div>
              </div>

              {/* Processed Chunks Status */}
              <p className="text-black font-bold text-lg  px-4 py-2 rounded-lg shadow-md">
                Processing Chunks : {processedChunks}/{totalChunks}
              </p>
              <div className="model-status">
                {modelStatus && <p>{modelStatus}</p>}
              </div>


            </div>
          ) : (
            // 🔹 Dropzone appears when no upload is in progress
            <label
              htmlFor="dropzone-file"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-800 border-dashed rounded-lg cursor-pointer bg-gray-200 hover:bg-gray-100"
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

          {/* {uploadingStarted && (
            <div className="w-full bg-gray-400 rounded-lg overflow-hidden mt-4">
              <div 
                className="bg-blue-500 text-xs leading-none py-1 text-center text-white rounded-lg transition-all duration-500" 
                style={{ width: `${totalChunks > 1 ? (processedChunks / totalChunks) * 100 : 0}%` }}
              >
                {totalChunks > 1
                  ? `${Math.round((processedChunks / totalChunks) * 100)}%`
                  : "Starting..."}
              </div>
            </div>
          )} */}
          {file && (
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
};

export default Dashboard;