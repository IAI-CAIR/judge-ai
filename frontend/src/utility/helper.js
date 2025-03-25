import { api } from "../api/api";

export const register = async (user) => {
    try {
        const response = await fetch(`${api}/api/register`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(user),
        });
        return await response.json();
    } catch (err) {
        return console.log(err);
    }
};

//sign in
export const signin = async (user) => {
    try {
        const response = await fetch(`${api}/api/login`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(user),
        });
        const data = await response.json();
        console.log("data", data);
        return data;
    } catch (error) {
        console.log(error);
    }
};

export const isAuthenticated = () => {
    if (typeof window === "undefined") {
        return false;
    }
    const jwt = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (jwt) {
        try {
            return { jwt, user };
        } catch (error) {
            console.error("Error parsing token:", error);
            return false;
        }
    }
    return false;
};