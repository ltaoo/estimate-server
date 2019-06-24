const User = require('../domain/User');
const userStore = require('../store/userStore');
const roomStore = require('../store/roomStore');

const io = require('../io');

/**
 * 用户登录，就是创建一个新用户
 * @param {Client} client - 发起登录请求的客户端
 * @param {string} username - 登录的用户名
 */
function handleLogin(client, { username }) {
    console.log('user login', username);
    const existedUser = userStore.findUserByName(username);
    if (existedUser) {
        client.emit('loginFail', {
            code: 100,
            message: '用户名已存在',
        });
        return;
    }
    const user = new User({
        id: client.id,
        name: username,
    });
    userStore.addUser(user);
    client.emit('loginSuccess', { user, rooms: roomStore.getRooms() });
}

/**
 * 客户端注销
 */
function handleLogout(client) {
    const { id } = client;
    userStore.removeUser(id);
    client.emit('logoutSuccess');
    client.disconnect();
}

/**
 * 客户端刷新后重连
 * @param {Client} client
 * @param {string} uuid
 */
function handleReconnect(client, { uuid }) {
    console.log(`reconnect handler ${uuid}`);
    // 去 store 查询该用户是否真的登录过
    const user = userStore.findUserByUuid(uuid);
    // 用户不存在，让用户重新登录
    if (user === undefined) {
        client.emit('reconnectFail', {
            code: 101,
            message: '用户不存在，请重新登录',
        });
        return;
    }
    console.log(`${user.name} reconnect`);
    user.updateId(client.id);
    const response = {
        user,
        rooms: roomStore.getRooms(),
    };
    client.emit('reconnectSuccess', response);
}

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

module.exports = {
    handleLogin,
    handleLogout,
    handleReconnect,
    handleDisconnect,
};
