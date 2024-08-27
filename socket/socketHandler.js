const jwt = require('jsonwebtoken');
const ChatModel = require('../models/chatModel');

module.exports = (io, db) => {
    const chatModel = new ChatModel(db);  // Create a new instance of ChatModel with the database

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error'));
        }
        jwt.verify(token, process.env.SECRET_TOKEN_KEY, (err, decoded) => {
            if (err) {
                return next(new Error('Authentication error'));
            }
            socket.user = decoded;
            next();
        });
    });

    io.on('connection', (socket) => {
        console.log('a user connected');

        if (socket.user.role === 'admin') {
            socket.join('admins');  // Admins join a specific room
        }

        socket.on('chat message', async (msg) => {
            const chatMessage = { user: socket.user.email, text: msg.text, timestamp: new Date() };
            await chatModel.create(chatMessage);

            if (socket.user.role === 'admin') {
                io.emit('chat message', chatMessage);  // Admin messages are sent to everyone
            } else {
                io.to('admins').emit('chat message', chatMessage);  // User messages are only sent to admins
            }
        });

        socket.on('load messages', async () => {
            const messages = await chatModel.findAll();
            socket.emit('previous messages', messages);
        });

        socket.on('disconnect', () => {
            console.log('user disconnected');
        });
    });
};
