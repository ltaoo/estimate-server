
const cuid = require('cuid');

const User = require('./User');
const Room = require('./Room');
const userStore = require('./userStore');
const roomStore = require('./roomStore');

const authHandler = require('./handlers/auth');
const roomHandler = require('./handlers/room');

const utils = require('./utils');
const io = require('./io');

const { noop, genRoomId } = utils;
// 用户连接池，可以考虑用简单的本地数据库替换
const {
    getUsers,
    addUser,
    removeUser,
    findUser,
    findUserByName,
} = userStore;
const {
    getRooms,
    addRoom,
    removeRoom,
    findRoom,
} = roomStore;

const {
    handleLogin,
    handleLogout,
    handleRecover,
} = authHandler;
const {
    handleCreateRoom,
    handleJoinRoom,
    handleLeaveRoom,
} = roomHandler;

io.on('connection', client => {
    console.log('new connection');
    // Auth
    client.on('recover', handleRecover.bind(null, client));
    client.on('login', handleLogin.bind(null, client));
    client.on('logout', handleLogout.bind(null, client));
    // Room
    client.on('createRoom', handleCreateRoom.bind(null, client));
    client.on('joinRoom', handleJoinRoom.bind(null, client));
    client.on('leaveRoom', handleLeaveRoom.bind(null, client));
    // Estimate
    client.on('startEstimate', handleStartEstimate.bind(null, client));
    client.on('estimate', handleEstimate.bind(null, client));
    client.on('restartEstimate', handleRestartEstimate.bind(null, client));
    client.on('showEstimateResult', handleShowResult.bind(null, client));
    client.on('stopEstimate', handleStopEstimate.bind(null, client));

    client.on('disconnect', handleDisconnect.bind(null, client));
});

setInterval(() => {
    console.log(userStore.getUsers());
    console.log(roomStore.getRooms());
    console.log('-----', new Date());
}, 5000);

function handleStartEstimate(client) {
    const { id } = client;
    const user = findUser(id);
    const { joinedRoomId: roomId } = user;
    if (roomId === null) {
        const errorMessage = { type: 'startEstimate', message: `${roomId} 房间不存在` };
        client.emit('err', errorMessage);
        return;
    }
    const room = findRoom(roomId);
    if (!room) {
        const errorMessage = { type: 'startEstimate', message: `${room.id} 房间不存在` };
        client.emit('err', errorMessage);
        return;
    }
    // 房间里的人都要开始
    room.members.forEach(u => {
        u.startEstimate();
    });
    room.updateStatus(Room.STATUS.STARTED);
    io.sockets.to(roomId).emit('startEstimate');
}

function handleEstimate(client, { value }) {
    const { id } = client;
    const user = findUser(id);
    const { joinedRoomId: roomId } = user;
    if (roomId === null) {
        console.log(`${user.name} 未加入房间`);
        const errorMessage = { type: 'estimate', message: `${user.name} 未加入房间` };
        client.emit('err', errorMessage);
        return;
    }
    const room = findRoom(roomId);
    if (room === undefined) {
        const errorMessage = { type: 'estimate', message: `${roomId} 房间不存在` };
        console.log(errorMessage);
        client.emit('err', errorMessage);
        return;
    }
    console.log(`${user.name} give estimate ${value}`);
    user.updateEstimate(value);
    const { members } = room;
    io.sockets.to(roomId).emit('estimate', {
        user,
        room,
        // 房间内所有成员都给出了估时，就通知客户端可以展示估时
        showEstimate: members.every(user => user.estimate !== null),
    });
}

function handleShowResult(client) {
    const { id } = client;
    const user = findUser(id);
    const { joinedRoomId: roomId } = user;
    if (roomId === null) {
        console.log(`${user.name} 未加入房间`);
        const errorMessage = { type: 'showEstimateResult', message: `${user.name} 未加入房间` };
        client.emit('err', errorMessage);
        return;
    }
    io.sockets.to(roomId).emit('showEstimateResultSuccess');
}

function handleRestartEstimate(client) {
    const { id } = client;
    const user = findUser(id);
    const { joinedRoomId: roomId } = user;
    if (roomId === null) {
        console.log(`${user.name} 未加入房间`);
        const errorMessage = { type: 'restartEstimate', message: `${user.name} 未加入房间` };
        client.emit('err', errorMessage);
        return;
    }
    const room = findRoom(roomId);
    room.members.forEach(member => {
        member.resetEstimate();
    });
    io.sockets.to(roomId).emit('restartEstimateSuccess');
}

function handleStopEstimate(client) {
    const { id } = client;
    const user = findUser(id);
    const { joinedRoomId: roomId } = user;
    if (roomId === null) {
        console.log(`${user.name} 未加入房间`);
        const errorMessage = { type: 'restartEstimate', message: `${user.name} 未加入房间` };
        client.emit('err', errorMessage);
        return;
    }
    const room = findRoom(roomId);
    room.members.forEach(member => {
        member.stopEstimate();
    });
    removeRoom(roomId);
    io.sockets.to(roomId).emit('stopEstimateSuccess');
}

/**
 * 客户端断开了连接
 * @param {Client} client 
 */
function handleDisconnect(client) {
    const { id } = client;
    console.log(`${client.id} is disconnect`);
}

function findEstimateById(id, estimates) {
    const estimate = estimates.find(r => r.id === id);
    return estimate;
}
