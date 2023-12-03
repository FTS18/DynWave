const express = require("express");
const path = require("path");
const app = express();
const fs = require("fs");
const server = require("http").createServer(app);
const io = require('socket.io')(server);

app.use(express.static(path.join(__dirname, "/public")));

const chatHistoryFilePath = path.join(__dirname, "chatHistory.txt");

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
    // Modify the "newuser" event handling on the server
    socket.on("newuser", function (userInfo) {
        const existingUser = chatHistory.find(user => user.username === userInfo.username);

        if (existingUser) {
            // Returning user, provide chat history to the user excluding their own messages
            const chatHistoryWithoutCurrentUser = existingUser.chatHistory.filter(message => message.username !== userInfo.username);
            socket.emit("chatHistory", chatHistoryWithoutCurrentUser);
        } else {
            // New user, initialize chat history
            const newUser = {
                username: userInfo.username,
                chatHistory: []
            };
            chatHistory.push(newUser);
            writeChatHistoryToFile(chatHistory);

            // Broadcast the new user to others
            io.emit("update", `${userInfo.username} joined the conversation`);
        }

        // Handle chat messages
        socket.on("chat", function (message) {
            const user = chatHistory.find(u => u.username === userInfo.username);
            if (user) {
                user.chatHistory.push(message);
                writeChatHistoryToFile(chatHistory);
                io.emit("chat", message);
            }
        });

        // Handle user exit
        socket.on("exituser", function () {
            io.emit("update", `${userInfo.username} left the conversation`);
        });
    });
});

server.listen(5000, () => {
    console.log('Server is running on http://localhost:5000');
});
