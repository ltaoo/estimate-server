const server = require('http').createServer();
const io = require('socket.io')(server);

const User = require('./User');
const userStore = require('./userStore');
const Room = require('./Room');
const roomStore = require('./roomStore');

const utils = require('./utils');

const { noop, genRoomId } = utils;
// 用户连接池
const { getUsers, addUser, removeUser, findUser, findUserByName } = userStore;
const { getRooms, addRoom, removeRoom, findRoom } = roomStore;

let globalEstimates = [];

io.on('connection', client => {
    const { username, refresh } = client.handshake.query;
    console.log('new connection', client.id, username);

    // 在客户端连接后，去数据库查询该用户是否已经连接过
    let user = findUserByName(username);
    if (user && refresh !== '1') {
        // 如果用户已存在
        user.updateClient(client);
        console.log(`${user.name} exist`, user);
        const { joinedRoomId } = user;
        const data = {
            user,
        };
        // 如果用户已经加入房间，在重连后仍然加入
        if (joinedRoomId !== null) {
            const room = findRoom(joinedRoomId);
            if (room !== undefined) {
                client.join(joinedRoomId);
                room.addMember(user);
                data.room = room;
                io.sockets.to(joinedRoomId).emit('joinRoomSuccess', {
                    user,
                    room,
                });
            }
        }
        client.emit('recoverSuccess', data);
    } else {
        user = new User({
            id: client.id,
            name: username,
            client,
        });
        console.log(`new user ${user.name}`);
        addUser(user);
        client.emit('loginSuccess', { user, rooms: getRooms() });
    }
    // 向全局广播有新用户加入
    // io.emit('newConnection', { user });
    client.on('logout', handleLogout.bind(null, client));

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

setInterval(() => {
    console.log('users', getUsers());
    console.log('rooms', getRooms());
    console.log('--------');
}, 5000);

/**
 * 客户端注销
 */
function handleLogout(client) {
    const { id } = client;
    removeUser(id);
    client.emit('logoutSuccess');
    client.disconnect();
}

/**
 * @param {Client} client - 客户端
 */
function handleCreateRoom(client) {
    const { id } = client;
    const owner = findUser(id);
    if (!owner) {
        client.emit('err', { type: 'createRoom', message: `用户 ${id} 不存在` });
        return;
    }
    const roomId = genRoomId();
    const newRoom = new Room({ id: roomId, admintor: owner });
    addRoom(newRoom);

    client.join(roomId);
    owner.createRoom(newRoom);
    const roomMembers = newRoom.members;
    // 可以向全局广播，让客户端更新大厅的房间列表
    client.emit('createRoomSuccess', {
        user: owner,
        room: newRoom,
    });
}

function handleJoinRoom(client, { roomId } = {}) {
    const { id } = client;
    const user = findUser(id);
    if (!user) {
        client.emit('err', { type: 'joinRoom', message: `用户 ${id} 不存在` });
        return;
    }
    console.log(`${id} ${user.name} join room ${roomId}`);
    const room = findRoom(roomId);
    if (!room) {
        const errorMessage = { type: 'joinRoom', message: `房间 ${roomId} 不存在` };
        client.emit('err', errorMessage);
        return;
    }
    if (room.status === Room.STATUS.STARTED) {
        const errorMessage = { type: 'joinRoom', message: `${roomId} 已经开始估时` };
        client.emit('err', errorMessage);
        return;
    }
    client.join(roomId);
    room.addMember(user);
    const roomMembers = room.members;
    io.sockets.to(roomId).emit('joinRoomSuccess', {
        user,
        room,
    });
}

function handleLeaveRoom(client) {
    const { id } = client;
    const user = findUser(id);
    if (!user) {
        client.emit('err', { message: `${id} 用户不存在` });
        return;
    }
    const { joinedRoomId: roomId } = user;
    if (roomId === null) {
        return;
    }
    const room = findRoom(roomId);
    if (!room) {
        client.emit('err', { type: 'leaveRoom', message: `${roomId} 房间不存在` });
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
        room,
    });
}

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
    console.log(`${client.id} is disconnect`);
    const user = findUser(id);
    if (!user) {
        client.emit('err', { type: 'disconnect', message: `${id} 用户不存在` });
        return;
    }
    // 判断是否有在房间内
    const { joinedRoomId: roomId } = user;
    if (roomId !== null) {
        // 向该房间的用户广播有人退出了
        const room = findRoom(roomId);
        if (!room) {
            console.log(`room ${roomId} not exist`);
            return;
        }
        room.removeMember(user);
        io.sockets.to(roomId).emit('leaveRoom', { user, room });
    }

    // 如果从房间离开前，只剩一个人了，在离开后就可以移除房间
    // if (room.members.length === 1) {
    //     removeRoom(room);
    //     io.emit('updateRooms', { rooms: getRooms() });
    //     return;
    // }
}

function findEstimateById(id, estimates) {
    const estimate = estimates.find(r => r.id === id);
    return estimate;
}
