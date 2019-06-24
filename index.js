const authHandler = require('./src/handlers/auth');
const roomHandler = require('./src/handlers/room');
const estimateHandler = require('./src/handlers/estimate');

// server.listen
const io = require('./src/io');

const {
    handleLogin,
    handleLogout,
    handleReconnect,
    handleDisconnect,
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

io.on('connection', (client) => {
    console.log('new connection');
    client.on('reconnect', handleReconnect.bind(null, client));
    client.on('disconnect', handleDisconnect.bind(null, client));
    // Auth
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
    client.on('showEstimateResult', handleShowResult.bind(null, client));
    client.on('restartEstimate', handleRestartEstimate.bind(null, client));
    client.on('stopEstimate', handleStopEstimate.bind(null, client));
});
