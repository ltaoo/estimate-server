const server = require('http').createServer();
const io = require('socket.io')(server);

const Room = require('./Room');
const User = require('./User');

function noop() {}

const genRoomId = (function () {
    let roomId = 0;
    return () => {
        roomId += 1;
        return String(roomId);
    };
}());
// 一个全局的客户端存储，每个客户端表示一个用户，正常来说是保存到数据库比如 redis 中
let globalUsers = [];
let globalRooms = [];
let globalEstimates = [];

io.on('connection', client => {
    const { username } = client.handshake.query;
    console.log('new connection', client.id, username);

    const user = new User({
        id: client.id,
        name: username,
        client,
    });

    globalUsers.push(user);

    // 向全局广播有新用户加入
    io.emit('newConnection', { user });

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
    const owner = findUserById(id, globalUsers);
    if (!owner) {
        client.emit('err', { message: `用户 ${id} 不存在` });
        return;
    }
    const roomId = genRoomId();
    const newRoom = new Room({ id: roomId, admintor: owner });
    globalRooms.push(newRoom);

    client.join(roomId);
    owner.createRoom(newRoom);
    const roomMembers = newRoom.members;
    io.sockets.to(roomId).emit('joinRoom', {
        roomId,
        user: owner,
        users: roomMembers,
    });
}

function handleJoinRoom(client, { roomId } = {}) {
    const { id } = client;
    const user = findUserById(id, globalUsers);
    if (!user) {
        client.emit('err', { message: `用户 ${id} 不存在` });
        return;
    }
    console.log(`${id} ${user.name} join room ${roomId}`);
    const room = findRoomById(roomId, globalRooms);
    if (!room) {
        const errorMessage = { message: `房间 ${roomId} 不存在` };
        client.emit('err', errorMessage);
        return;
    }
    if (room.status === Room.STATUS.STARTED) {
        const errorMessage = { message: `${roomId} 已经开始估时` };
        client.emit('err', errorMessage);
        return;
    }
    client.join(roomId);
    room.addMember(user);
    const roomMembers = room.members;
    io.sockets.to(roomId).emit('joinRoom', {
        roomId,
        user,
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

/**
 * 客户端断开了连接
 * @param {Client} client 
 */
function handleDisconnect(client) {
    const { id } = client;
    const user = findUserById(id, globalUsers);
    // 从用户上拿到房间 id，向该房间的用户广播有人退出了
    const { joinedRoomId: roomId } = user;
    // 断开连接后移除用户
    globalUsers = removeUserById(id, globalUsers);
    globalEstimates = globalEstimates.filter(e => e.id !== id);
    // 判断下房间还有多少人，如果没有了就移除房间
    console.log(`${client.id} ${user.name} is disconnect`);
    const room = findRoomById(roomId, globalRooms);
    room.removeMember(user);
    io.sockets.to(roomId).emit('leaveRoom', { user, users: room.members });
}

function findUserById(id, users) {
    const user = users.find(u => u.id === id);
    return user;
}
function removeUserById(id, users) {
    return users.filter(user => user.id !== id);
}

function findRoomById(id, rooms) {
    const room = rooms.find(r => r.id === id);
    return room;
}

function findEstimateById(id, estimates) {
    const estimate = estimates.find(r => r.id === id);
    return estimate;
}
