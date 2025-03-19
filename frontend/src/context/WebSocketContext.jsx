import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import { api } from "../api/api";

// Create WebSocket Context
const WebSocketContext = createContext(null);

// Custom Hook for Using WebSocket Context
export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [progress, setProgress] = useState("");
  const [processedChunks, setProcessedChunks] = useState(0);
  const [totalChunks, setTotalChunks] = useState(1);
  const [uploadingStarted, setUploadingStarted] = useState(false);
  // const [processingCompletedMessage, setProcessingCompletedMessage] = useState("");
  const [processingCompleted, setProcessingCompleted] = useState(false);
  useEffect(() => {
    if (!socketRef.current) {
      setProgress("Connecting to Server...");
      socketRef.current = io(api, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
      });

      // ✅ Connection Success
      socketRef.current.on("connect", () => {
        setProgress("Connected to Server ✅");
        toast.success("Connected to server ✅");
      });

      socketRef.current.on("reconnect", (attempt) => {
        console.log(`Reconnected after ${attempt} attempts`);
        setProgress("Reconnected to server ✅");

        const savedBookId = localStorage.getItem("book_id");
        if (savedBookId) {
          console.log("Resuming process for book_id:", savedBookId);
          socketRef.current.emit("resume_process", { book_id: savedBookId });  // ✅ Ensure process resumes
        }
      });;

      // ❌ Connection Error
      socketRef.current.on("connect_error", () => {
        console.error("Server connection failed ❌. Retrying...");
        setProgress("Server connection failed. Retrying... 🔄");
        toast.error("Server connection failed. Retrying...");
      });


      // ✅ Upload Status Updates
      socketRef.current.on("upload_status", (data) => {
        if (data.message) {
          console.log("Upload status update:", data.message);
          toast.success(data.message);
        }
      });


      // ✅ Progress Updates
      socketRef.current.on("progress_update", (data) => {
        if (data.message) {
          setProgress(data.message);
          localStorage.setItem("progress", data.message);

          const match = data.message.match(/Processing chunk (\d+)\/(\d+)/);
          if (match) {
            const processed = parseInt(match[1], 10);
            const total = parseInt(match[2], 10);
            setProcessedChunks(processed);
            setTotalChunks(total);

            localStorage.setItem("processedChunks", processed);
            localStorage.setItem("totalChunks", total);
            if (processed === total) {
              setProcessingCompleted(true);
              toast.success("Processing completed! 🎉");
            }
          }
        }
      });


      // ✅ Completed Processing
      socketRef.current.on("completed", (data) => {
        if (data.message) {
          console.log("Processing completed:", data.message);
          // toast.success("Processing completed! 🎉");
          setProcessingCompleted(true);
          setTimeout(() => setUploadingStarted(false), 500);
          localStorage.removeItem("uploadingStarted");
          if (processed === total) {
            setProcessingCompleted(true);
            toast.success("Processing completed! 🎉");
          }
        }
      });

      // ❌ Error Handling
      socketRef.current.on("error", (error) => {
        console.error("WebSocket error:", error);
        setProgress(`Error occurred: ${error?.message || "Unknown error"}`);
        toast.error(`Error: ${error?.message || "Unknown error"}`);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off("connect");
        socketRef.current.off("reconnect");
        socketRef.current.off("connect_error");
        socketRef.current.off("upload_status");
        socketRef.current.off("progress_update");
        socketRef.current.off("completed");
        socketRef.current.off("error");

        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };

  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        progress,
        processedChunks,
        totalChunks,
        uploadingStarted,
        setUploadingStarted,
        // processingCompletedMessage,
        processingCompleted,
        socket: socketRef.current,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};
