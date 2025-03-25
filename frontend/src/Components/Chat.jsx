import { useState } from "react";
import { Button } from "@material-tailwind/react";

export const Chat = () => {
    const [messages, setMessages] = useState([
        { text: "Hello! How can I assist you today?", sender: "bot" },
        { text: "Can you tell me a joke?", sender: "user" },
        { text: "Sure! Why don’t skeletons fight each other? They don’t have the guts!", sender: "bot" },
        { text: "Hello! How can I assist you today?", sender: "bot" },
        { text: "Can you tell me a joke?", sender: "user" },
        { text: "Sure! Why don’t skeletons fight each other? They don’t have the guts!", sender: "bot" },
        { text: "Hello! How can I assist you today?", sender: "bot" },
        { text: "Can you tell me a joke?", sender: "user" },
        { text: "Sure! Why don’t skeletons fight each other? They don’t have the guts!", sender: "bot" },
        { text: "Hello! How can I assist you today?", sender: "bot" },
        { text: "Can you tell me a joke?", sender: "user" },
        { text: "Sure! Why don’t skeletons fight each other? They don’t have the guts!", sender: "bot" },
        { text: "Hello! How can I assist you today?", sender: "bot" },
        { text: "Can you tell me a joke?", sender: "user" },
        { text: "Sure! Why don’t skeletons fight each other? They don’t have the guts!", sender: "bot" },
        { text: "Hello! How can I assist you today?", sender: "bot" },
        { text: "Can you tell me a joke?", sender: "user" },
        { text: "Sure! Why don’t skeletons fight each other? They don’t have the guts!", sender: "bot" },
        { text: "Hello! How can I assist you today?", sender: "bot" },
        { text: "Can you tell me a joke?", sender: "user" },
        { text: "Sure! Why don’t skeletons fight each other? They don’t have the guts!", sender: "bot" },
        { text: "Hello! How can I assist you today?", sender: "bot" },
        { text: "Can you tell me a joke?", sender: "user" },
        { text: "Sure! Why don’t skeletons fight each other? They don’t have the guts!", sender: "bot" },
        { text: "Hello! How can I assist you today?", sender: "bot" },
        { text: "Can you tell me a joke?", sender: "user" },
        { text: "Sure! Why don’t skeletons fight each other? They don’t have the guts!", sender: "bot" },
        { text: "Hello! How can I assist you today?", sender: "bot" },
        { text: "Can you tell me a joke?", sender: "user" },
        { text: "Sure! Why don’t skeletons fight each other? They don’t have the guts!", sender: "bot" },
    ]);
    const [input, setInput] = useState("");

    const sendMessage = () => {
        if (input.trim() === "") return;
        setMessages([...messages, { text: input, sender: "user" }]);
        setInput("");

        // Simulating a bot response
        setTimeout(() => {
            setMessages(prev => [...prev, { text: "This is a bot response!", sender: "bot" }]);
        }, 1000);
    };

    return (
        <main className="flex max-w-8/12 bg-cyan-300 mx-auto flex-col items-center justify-center  rounded-lg shadow-lg text-white p-4 ">
            <div className="flex flex-col gap-4 w-full h-[84vh] justify-between items-center">
                <div className="w-full text-black p-4 flex flex-col gap-2 h-fit overflow-y-auto">
                    {messages.map((msg, index) => (
                        <div key={index} className={`p-2 rounded-lg shadow-md max-w-[75%] ${msg.sender === "user" ? "bg-cyan-500 self-end text-white" : "bg-gray-200 text-black"}`}>
                            {msg.text}
                        </div>
                    ))}
                </div>
                <div className="relative flex w-full max-w-md">
                    <input
                        type="email"
                        label="Email Address"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="pr-20 w-full py-2 pl-4 rounded-lg border border-gray-300 focus:outline-none focus:border-cyan-500 bg-white text-black"
                        placeholder="Type a message..."
                    />
                    <Button
                        size="sm"
                        color={input ? "gray" : "cyan-gray"}
                        disabled={!input}
                        onClick={sendMessage}
                        className="!absolute right-1 top-1 rounded"
                    >
                        Send
                    </Button>
                </div>
            </div>
        </main>
    );
};