const http = require('http');
const express = require('express');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// 用来给客户端确认服务端的可用性
app.get('/api/ping', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    }
    res.send('{}');
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`server is listening at port ${PORT}`);
});

module.exports = io;
