const server = require('http').createServer();
const io = require('socket.io')(server);

const User = require('./User');
const userStore = require('./userStore');
const Room = require('./Room');
const roomStore = require('./roomStore');

const utils = require('./utils');

const { noop, genRoomId } = utils;
const { addUser, removeUser, findUser } = userStore;
const { getRooms, addRoom, removeRoom, findRoom } = roomStore;

let globalEstimates = [];

io.on('connection', client => {
    const { username } = client.handshake.query;
    console.log('new connection', client.id, username);

    const user = new User({
        id: client.id,
        name: username,
        client,
    });

    addUser(user);

    // 向全局广播有新用户加入
    io.emit('newConnection', { user });
    client.emit('getRooms', { rooms: getRooms() });

    client.on('createRoom', handleCreateRoom.bind(null, client));
    client.on('joinRoom', handleJoinRoom.bind(null, client));
    client.on('leaveRoom', handleLeaveRoom.bind(null, client));

    client.on('startEstimate', handleStartEstimate.bind(null, client));
    client.on('estimate', handleEstimate.bind(null, client));
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
    const owner = findUser(id);
    if (!owner) {
        client.emit('err', { message: `用户 ${id} 不存在` });
        return;
    }
    const roomId = genRoomId();
    const newRoom = new Room({ id: roomId, admintor: owner });
    addRoom(newRoom);

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
    const user = findUser(id);
    if (!user) {
        client.emit('err', { message: `用户 ${id} 不存在` });
        return;
    }
    console.log(`${id} ${user.name} join room ${roomId}`);
    const room = findRoom(roomId);
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

function handleLeaveRoom(client, { roomId }) {
    const { id } = client;
    const user = findUser(id);
    if (!user) {
        client.emit('err', { message: `${id} 用户不存在` });
        return;
    }
    const room = findRoom(roomId);
    if (!room) {
        client.emit('err', { message: `${roomId} 房间不存在` });
        return;
    }
    if (room.members.length === 1) {
        // @TODO 直接从全局移除，这个房间在 io 对象上还存在吗？
        removeRoom(roomId);
        io.emit('updateRooms', { rooms: getRooms() });
        return;
    }
    room.removeMember(user);
    console.log(`${user.name} leave room ${roomId}`);
    io.sockets.to(roomId).emit('leaveRoom', {
        user,
        users: room.members,
    });
}

function handleStartEstimate(client, { roomId }) {
    const room = findRoom(roomId);
    if (!room) {
        const errorMessage = { message: `${room.id} 房间不存在` };
        client.emit('err', errorMessage);
        return;
    }
    room.updateStatus(Room.STATUS.STARTED);
    io.sockets.to(roomId).emit('startEstimate');
}

function handleEstimate(client, { value, roomId }) {
    const { id } = client;
    const user = findUser(id);
    const room = findRoom(roomId);
    console.log(`${user.name} give estimate ${value}`);
    user.updateEstimate(value);
    const members = room.members;
    io.sockets.to(roomId).emit('estimate', {
        user,
        users: members,
        // 房间内所有成员都给出了估时，就通知客户端可以展示估时
        showEstimate: members.every(user => user.estimate !== null),
    });
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
    const user = findUser(id);
    // 从用户上拿到房间 id，向该房间的用户广播有人退出了
    const { joinedRoomId: roomId } = user;
    // 断开连接后移除用户
    removeUser(id);
    globalEstimates = globalEstimates.filter(e => e.id !== id);
    console.log(`${client.id} ${user.name} is disconnect`);
    const room = findRoom(roomId);
    if (!room) {
        console.log(`${roomId} not exist`);
        return;
    }
    // 如果从房间离开前，只剩一个人了，在离开后就可以移除房间
    if (room.members.length === 1) {
        removeRoom(room);
        io.emit('updateRooms', { rooms: getRooms() });
        return;
    }
    room.removeMember(user);
    io.sockets.to(roomId).emit('leaveRoom', { user, users: room.members });
}

function findEstimateById(id, estimates) {
    const estimate = estimates.find(r => r.id === id);
    return estimate;
}
