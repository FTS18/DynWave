const express = require("express");
const path = require("path");
const app = express();
const fs = require("fs");
const server = require("http").createServer(app);
const io = require('socket.io')(server);

app.use(express.static(path.join(__dirname, "/public")));

const chatHistoryFilePath = path.join(__dirname, "chatHistory.txt");
const userPasswords = {}; // Store user passwords

function readChatHistoryFromFile() {
    try {
        const data = fs.readFileSync(chatHistoryFilePath, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading chat history file:", error.message);
        return [];
    }
}

function writeChatHistoryToFile(chatHistory) {
    try {
        const data = JSON.stringify(chatHistory, null, 2);
        fs.writeFileSync(chatHistoryFilePath, data, "utf8");
    } catch (error) {
        console.error("Error writing chat history file:", error.message);
    }
}

const chatHistory = readChatHistoryFromFile();
io.on("connection", function (socket) {
    socket.on("newuser", function (userInfo) {
        const storedPassword = userPasswords[userInfo.username];

        if (storedPassword) {
            if (!userInfo.password || storedPassword !== userInfo.password) {
                // Password mismatch or not provided, display error message and do not proceed
                socket.emit("update", 'Wrong password, kindly retry.');
                return;
            }
        } else {
            // This is the first time the user is logging in, store the password
            userPasswords[userInfo.username] = userInfo.password;
        }

        const existingUser = chatHistory.find(user => user.username === userInfo.username);

        if (existingUser) {
            // Returning user, provide sorted chat history to the user
            const sortedChatHistory = chatHistory.flatMap(user => user.chatHistory);
            sortedChatHistory.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            socket.emit("chatHistory", sortedChatHistory);
        } else {
            // New user, initialize chat history
            const newUser = {
                username: userInfo.username,
                chatHistory: []
            };
            chatHistory.push(newUser);
            writeChatHistoryToFile(chatHistory);

            // Broadcast the new user to others
            const systemMessage = {
                username: 'system',
                text: `${userInfo.username} joined the conversation`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            io.emit("chat", systemMessage);
            newUser.chatHistory.push(systemMessage);
            writeChatHistoryToFile(chatHistory);

            // Emit the entire sorted chat history to all users
            const sortedChatHistory = chatHistory.flatMap(user => user.chatHistory);
            sortedChatHistory.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            io.to(userInfo.username).emit("chatHistory", sortedChatHistory);
        }

        // Proceed to show the chat screen only if authentication is successful
        socket.join(userInfo.username); // Join a room with the username
        io.to(userInfo.username).emit("update", "You have joined the conversation.");

        socket.on("chat", function (message) {
            const user = chatHistory.find(u => u.username === userInfo.username);

            if (user) {
                if (!user.chatHistory) {
                    // Initialize chatHistory if not exists
                    user.chatHistory = [];
                }

                // Add timestamp to the message
                message.timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                user.chatHistory.push(message);
                writeChatHistoryToFile(chatHistory);

                // Add user color and timestamp to the message before broadcasting
                message.color = userInfo.color;
                io.emit("chat", message);
            }
        });

        // Handle user exit
        socket.on("exituser", function () {
            const systemMessage = {
                username: 'system',
                text: `${userInfo.username} left the conversation`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            io.emit("chat", systemMessage);
        });

        // Handle disconnection (user closes the tab)
        socket.on("disconnect", function () {
            if (userInfo) {
                const systemMessage = {
                    username: 'system',
                    text: `${userInfo.username} left the conversation`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                io.emit("chat", systemMessage);
            }
        });
    });
});

server.listen(5000, () => {
    console.log('Server is running on http://localhost:5000');
});
