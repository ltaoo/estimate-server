const server = require('http').createServer();
const io = require('socket.io')(server);

let roomId = 0;
// 一个全局的客户端存储，每个客户端表示一个用户，正常来说是保存到数据库比如 redis 中
let users = [];

io.on('connection', client => {
    // 它这里是「监听」连接，所以 client 是有多个的！！！
    // 每个 client 会分配一个唯一 id
    // io 和 client 都有 emit 方法，但 io 是全局广播, client 是只推送到指定客户端
    const { username } = client.handshake.query;
    console.log('new connection', client.id, username);

    const user = {
        id: client.id,
        username,
    };

    users.push(user);

    // 向全局广播有新用户加入
    // io.emit('join', { user });

    client.on('createRoom', handleCreateRoom.bind(null, client));

    client.on('joinRoom', handleJoinRoom.bind(null, client));

    client.on('disconnect', handleDisconnect.bind(null, client));
});

server.listen(3000, '0.0.0.0', () => {
    console.log('server is listening at port 3000');
});

/**
 * @param {Message} data - 客户端传过来的数据
 * @param {Client} client - 客户端
 */
function handleCreateRoom(client, data, cb) {
    const { id } = client;
    roomId += 1;
    console.log('create room', roomId);
    const owner = users.find(user => user.id === id);
    if (!owner) {
        client('error', { message: `用户 ${id} 不存在` });
        return;
    }
    const roomIdStr = String(roomId);
    owner.roomId = roomIdStr;
    owner.admin = true;
    client.join(roomIdStr);
    const roomMemberIds = Object.keys(client.rooms);
    cb({
        roomId: roomIdStr,
        users: users.filter(user => roomMemberIds.includes(user.id)),
    });
}

function handleJoinRoom(client, data) {
    const { roomId, username } = data;
    users.push({
        id: client.id,
        username,
    });
    // 想要加入的房间广播有人加入房间
    io.sockets.in(roomId).emit('joinRoom', {
        id: client.id,
        username,
        users,
    });
}

function handleDisconnect(client, data) {
    // 断开连接后移除用户
    users = users.filter(user => user.id !== client.id);
    console.log(`${client.id} is disconnect`);
}
