(function () {
    const app = document.querySelector(".app");
    const socket = io();
    let uname;

    // Add the password field to the join screen
    app.querySelector("#join-user").addEventListener("click", function () {
        let username = app.querySelector("#username").value.trim().toLowerCase();
        let password = app.querySelector("#password").value;

        if (username.length == 0 || password.length == 0) {
            return;
        }

        socket.emit("newuser", { username, password });
        uname = username;
        app.querySelector(".join-screen").classList.remove("active");
        app.querySelector(".chat-screen").classList.add("active");
    });


    const msgInput = app.querySelector("#msg-input");

    msgInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            sendMessage();
        }
    });

    app.querySelector("#send-msg").addEventListener("click", sendMessage);

    app.querySelector("#exit-chat").addEventListener("click", function () {
        socket.emit("exituser", uname);
        window.location.href = window.location.href;
    });
    socket.on("chatHistory", function (chatHistory) {
        chatHistory.forEach((message) => {
            renderMessage(message.username === uname ? 'my' : 'other', message);
        });
    });

    socket.on("update", function (update) {
        renderMessage("update", update);
        document.getElementById('wrong-password-message').innerText = 'Enter the correct password!';
    });

    socket.on("chat", function (message) {
        if (message.username !== uname) {
            // Render the message only if it's not from the current user
            renderMessage("other", message);
        }
    });

    function sendMessage() {
        let message = msgInput.value;
        if (message.length == 0) {
            return;
        }

        // Get the current timestamp
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Render the "my" message only if it's not a duplicate
        if (msgInput.value !== msgInput.getAttribute('data-last-message')) {
            renderMessage("my", { username: uname, text: message, timestamp });
            socket.emit("chat", { username: uname, text: message, timestamp }); // Include timestamp
            msgInput.setAttribute('data-last-message', msgInput.value);
        }

        msgInput.value = '';
    }

    function renderMessage(type, content) {
        let messageContainer = app.querySelector(".chat-screen .messages");
        let el = document.createElement('div');
        let messageClass, nameClass;

        if (type === 'my') {
            messageClass = "my-message";
            nameClass = "name-my";
        } else if (type === "other") {
            messageClass = "other-message";
            nameClass = "name-other";
        } else if (type === "update") {
            messageClass = "update";
            nameClass = "name-update";
        }

        const isCurrentUser = type === 'my';

        el.className = `message ${messageClass} ${isCurrentUser ? 'current-user' : ''}`;
        el.innerHTML = `<div>
            <div class='${nameClass}' style='color: ${getUsernameColor(content.username)}'>${content.username}</div>
            <div class='text'>${content.text}</div>
            <div class='timestamp ${isCurrentUser ? 'right' : 'left'}'>${content.timestamp}</div>
        </div>`;

        messageContainer.appendChild(el);
        messageContainer.scrollTop = messageContainer.scrollHeight - messageContainer.clientHeight;
    }

    function getUsernameColor(username) {
        const hash = hashCode(username);
        const color = intToRGB(hash);
        return color;
    }

    function hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return hash;
    }

    function intToRGB(i) {
        const c = (i & 0x00FFFFFF)
            .toString(16)
            .toUpperCase();
        return "#" + "00000".substring(0, 6 - c.length) + c;
    }
})();
