const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');

// --- WARNING ---
// It is strongly recommended to use environment variables for sensitive data like bot tokens.
// For example, you could use a .env file and the dotenv package.
// const botToken = process.env.TELEGRAM_BOT_TOKEN;
// const chatId = process.env.TELEGRAM_CHAT_ID;
const botToken = '8406577100:AAF7mvVd2svcSC7A2GdI6aq-i5x7o_sTbto';
const chatId = '612575358';

// Initialize Telegram Bot
const bot = new TelegramBot(botToken);

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());
// Serve static files from the 'public' directory
app.use(express.static('public'));

// A map to store waiting users. Key: socket.id, Value: socket object
const waitingUsers = new Map();

io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);
    
    // Add user to the waiting list
    waitingUsers.set(socket.id, socket);

    // Notify admin via Telegram
    const message = `A new user has connected.\nUser ID: ${socket.id}`;
    bot.sendMessage(chatId, message).catch(err => {
        console.error('Failed to send Telegram message:', err);
    });

    socket.on('disconnect', () => {
        console.log(`A user disconnected: ${socket.id}`);
        // Remove user from the waiting list
        waitingUsers.delete(socket.id);
    });
});

// API endpoint for the admin to get the list of waiting users
app.get('/api/users', (req, res) => {
    res.json(Array.from(waitingUsers.keys()));
});

// API endpoint for the admin to accept or reject a user
app.post('/api/action', (req, res) => {
    const { userId, action } = req.body;

    if (!userId || !action) {
        return res.status(400).json({ error: 'userId and action are required' });
    }

    const userSocket = waitingUsers.get(userId);

    if (userSocket) {
        const redirectPage = action === 'accept' ? '/accepted.html' : '/rejected.html';
        userSocket.emit('redirect', { url: redirectPage });
        
        // Remove the user from the waiting list after action is taken
        waitingUsers.delete(userId);
        
        console.log(`Action '${action}' sent to user ${userId}`);
        res.status(200).json({ success: true, message: `Action '${action}' sent to user ${userId}` });
    } else {
        res.status(404).json({ error: 'User not found or already handled' });
    }
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
