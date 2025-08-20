const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

const bot = new TelegramBot(botToken);

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const waitingUsers = new Map();

io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);
    waitingUsers.set(socket.id, socket);

    const message = `A new user has connected.\nUser ID: ${socket.id}`;
    bot.sendMessage(chatId, message).catch(err => {
        console.error('Failed to send Telegram message:', err);
    });

    socket.on('disconnect', () => {
        console.log(`A user disconnected: ${socket.id}`);
        waitingUsers.delete(socket.id);
    });
});

app.get('/api/users', (req, res) => {
    res.json(Array.from(waitingUsers.keys()));
});

app.post('/api/action', (req, res) => {
    const { userId, action } = req.body;

    if (!userId || !action) {
        return res.status(400).json({ error: 'userId and action are required' });
    }

    const userSocket = waitingUsers.get(userId);

    if (userSocket) {
        const redirectPage = action === 'accept' ? '/accepted.html' : '/rejected.html';
        userSocket.emit('redirect', { url: redirectPage });
        
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
