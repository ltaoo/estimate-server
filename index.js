const userStore = require('./userStore');
const roomStore = require('./roomStore');

const authHandler = require('./handlers/auth');
const roomHandler = require('./handlers/room');
const estimateHandler = require('./handlers/estimate');

const io = require('./io');

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
const {
    handleStartEstimate,
    handleEstimate,
    handleBackEstimate,
    handleClearEstimate,
    handleShowResult,
    handleRestartEstimate,
    handleStopEstimate,
} = estimateHandler;

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
    client.on('backEstimate', handleBackEstimate.bind(null, client));
    client.on('clearEstimate', handleClearEstimate.bind(null, client));
    client.on('restartEstimate', handleRestartEstimate.bind(null, client));
    client.on('showEstimateResult', handleShowResult.bind(null, client));
    client.on('stopEstimate', handleStopEstimate.bind(null, client));
    // Disconnect
    client.on('disconnect', handleDisconnect.bind(null, client));
});

setInterval(() => {
    console.log(userStore.getUsers());
    console.log(roomStore.getRooms());
    console.log('-----', new Date());
}, 5000);

/**
 * 客户端断开了连接
 * @param {Client} client 
 */
function handleDisconnect(client) {
    const { id } = client;
    console.log(`${client.id} is disconnect`);
    const user = userStore.findUser(id);
    if (user === undefined) {
        return;
    }
    const { joinedRoomId } = user;
    if (joinedRoomId === null) {
        return;
    }
    const room = roomStore.findRoom(joinedRoomId);
    if (room === undefined) {
        return;
    }
    room.removeMember(user);
    io.sockets.to(joinedRoomId).emit('globalLeaveRoomSuccess', {
        user,
        room,
    });
}
