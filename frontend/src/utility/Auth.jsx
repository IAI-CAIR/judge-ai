import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { api } from "../api/api";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const socketRef = useRef(null);
    const [progress, setProgress] = useState("Waiting for Upload....");
    const [toastMessage, setToastMessage] = useState(null);
    const [toastType, setToastType] = useState("");
    const [error, setError] = useState("");
    const socketio = socketRef.current;
    const [auth, setAuth] = useState(() => {
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("user");
        if (token) {
            return user, token;
        }
        return null
    });

    const login = (data) => {
        setAuth(data);
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user", data.user);
    };
    useEffect(() => {

        if (!socketRef.current) {
            setProgress("Connecting to Server...");

            socketRef.current = io(api, {
                transports: ["websocket"],
                reconnectionAttempts: 5,
                reconnectionDelay: 2000,
            });

            socketRef.current.on("connect", () => {
                setProgress("Connected to WebSocket ✅");
                setToastMessage("Connected to the server ✅");
                setToastType("success");
            });

            socketRef.current.on("connect_error", (error) => {
                console.error("WebSocket connection failed ❌. Retrying...", error);
                setProgress("Server connection failed. Retrying... 🔄");
                setToastMessage("Server connection failed. Retrying...");
                setToastType("error");
            });

            // socketRef.current.on("progress_update", (data) => {
            //     console.log("Received update:", data);

            //     if (data.message) {

            //         // Handle Model Connection Status

            //         const match = data.message.match(/Processing chunk (\d+)\/(\d+)/);
            //         if (match) {
            //             const processed = parseInt(match[1], 10);
            //             const total = parseInt(match[2], 10);
            //             setProcessedChunks(processed);
            //             setTotalChunks(total);
            //         }
            //     }
            // });

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
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => {
                setToastMessage(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);
    return (
        <SocketContext.Provider value={{ socketio, login, auth, error, setError }}>
            {children}
            {toastMessage && (
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
            )}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
