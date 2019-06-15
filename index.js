const server = require('http').createServer();
const io = require('socket.io')(server);

function noop() {}

let roomId = 0;
// 一个全局的客户端存储，每个客户端表示一个用户，正常来说是保存到数据库比如 redis 中
let globalUsers = [];
let globalRooms = [];
let globalEstimates = [];

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

    globalUsers.push(user);

    // 向全局广播有新用户加入
    // io.emit('join', { user });

    client.on('createRoom', handleCreateRoom.bind(null, client));

    client.on('joinRoom', handleJoinRoom.bind(null, client));

    client.on('startEstimate', handleStartEstimate.bind(null, client));
    client.on('estimate', handleEstimate.bind(null, client));
    client.on('updateEstimate', handleUpdateEstimate.bind(null, client));
    client.on('restartEstimate', handleRestartEstimate.bind(null, client));
    client.on('endEstimate', handleEndEstimate.bind(null, client));

    client.on('showResult', handleShowResult.bind(null, client));

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
    const owner = globalUsers.find(user => user.id === id);
    if (!owner) {
        client('error', { message: `用户 ${id} 不存在` });
        return;
    }
    const roomIdStr = String(roomId);
    // 将新创建的房间加入全局变量
    globalRooms.push({ id: roomIdStr, status: true });
    owner.roomId = roomIdStr;
    owner.admin = true;
    client.join(roomIdStr);
    const roomMemberIds = Object.keys(client.rooms);
    cb({
        roomId: roomIdStr,
        users: globalUsers.filter(user => roomMemberIds.includes(user.id)),
    });
}

function handleJoinRoom(client, data = {}, cb = noop) {
    const { id } = client;
    const { roomId } = data;
    const roomIdStr = String(roomId);
    const user = globalUsers.find(u => u.id === id);
    if (!user) {
        console.log(`${id} 不存在`);
        client.emit('err', {
            message: '用户不存在',
        });
        return;
    }
    console.log(`${id} ${user.username} join room ${roomIdStr}`);
    const selectedRoom = globalRooms.find(r => r.id === roomIdStr);
    if (!selectedRoom) {
        const errorMessage = '该房间不存在';
        client.emit('err', new Error(errorMessage));
        cb(errorMessage);
        return;
    }
    if (selectedRoom.status === false) {
        const errorMessage = '已经开始估时';
        client.emit('err', new Error(errorMessage));
        cb(errorMessage);
        return;
    }
    client.join(roomIdStr);
    const roomMemberIds = Object.keys(io.nsps['/'].adapter.rooms[roomIdStr].sockets);
    const roomMembers = globalUsers.filter(user => roomMemberIds.includes(user.id));
    console.log(roomMembers);
    // 想要加入的房间广播有人加入房间
    io.sockets.to(roomIdStr).emit('joinRoom', {
        user,
        users: roomMembers,
    });
    cb(null, {
        user,
        roomId: roomIdStr,
        users: roomMembers,
    });
}

function handleStartEstimate(client, data) {
    const { roomId } = data;
    const roomIdStr = String(roomId);
    const selectedRoom = globalRooms.find(r => r.id === roomIdStr);
    if (!selectedRoom) {
        const errorMessage = '该房间不存在';
        client.emit('err', new Error(errorMessage));
        cb(errorMessage);
        return;
    }
    selectedRoom.status = false;
    io.sockets.to(roomIdStr).emit('startEstimate');
}

function handleEstimate(client, data) {
    const { id } = client;
    const { value, roomId } = data;
    const user = findUserById(id, globalUsers);
    console.log(`${user.username} give estimate ${value}`);
    globalEstimates.push({
        id,
        username: user.username,
        value,
    });
    io.sockets.to(roomId).emit('estimate', { user, estimate: value, estimates: globalEstimates });
    const roomMemberIds = Object.keys(io.nsps['/'].adapter.rooms[roomId].sockets);
    const userNumber = roomMemberIds.length;
    // 如果给出估时的人数等于总人数，就通知客户端展示估时
    console.log('input estimate', userNumber, globalEstimates.length);
    if (globalEstimates.length === userNumber) {
        io.sockets.to(roomId).emit('showEstimate');
    }
}

function handleUpdateEstimate(client, data) {
    const { id } = client;
    const { value, roomId } = data;
    const user = findUserById(id, globalUsers);
    console.log(`${user.username} update estimate ${value}`);
    const prevEstimate = findEstimateById(id, globalEstimates);
    prevEstimate.value = value;
    io.sockets.to(roomId).emit('estimate', { user, estimate: value, estimates: globalEstimates });
    const roomMemberIds = Object.keys(io.nsps['/'].adapter.rooms[roomId].sockets);
    const userNumber = roomMemberIds.length;
    // 如果给出估时的人数等于总人数，就通知客户端展示估时
    console.log('update estimate', userNumber, globalEstimates.length);
    if (globalEstimates.length === userNumber) {
        io.sockets.to(roomId).emit('showEstimate');
    }
}

function handleEndEstimate(client, data) {
    const { roomId } = data;
    globalEstimates = [];
    io.sockets.to(roomId).emit('restartEstimate');
}

function handleShowResult(client, data) {
    const { roomId } = data;
    io.sockets.to(roomId).emit('showResult');
}

function handleRestartEstimate(client, data) {
    const { roomId } = data;
    globalEstimates = [];
    io.sockets.to(roomId).emit('restartEstimate');
}

function handleDisconnect(client, data) {
    const { id } = client;
    // 断开连接后移除用户
    globalUsers = globalUsers.filter(user => user.id !== client.id);
    globalEstimates = globalEstimates.filter(e => e.id !== id);
    // 判断下房间还有多少人，如果没有了就移除房间
    console.log(`${client.id} is disconnect`);
}

function findUserById(id, users) {
    const user = users.find(u => u.id === id);
    return user;
}

function findRoomById(id, rooms) {
    const room = rooms.find(r => r.id === id);
    return room;
}

function findEstimateById(id, estimates) {
    const estimate = estimates.find(r => r.id === id);
    return estimate;
}
