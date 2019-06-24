const User = require('../User');
const userStore = require('../userStore');
const roomStore = require('../roomStore');
const io = require('../io');

/**
 * 用户登录，就是创建一个新用户
 * @param {Client} client - 发起登录请求的客户端
 * @param {string} username - 登录的用户名
 */
function handleLogin(client, { username }) {
    console.log('user login', username);
    const { id } = client;
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
    removeUser(id);
    client.emit('logoutSuccess');
    client.disconnect();
}

/**
 * 客户端刷新后重连
 * @param {Client} client
 * @param {string} uuid
 */
function handleRecover(client, { uuid }) {
    // 去 store 查询该用户是否真的登录过
    let user = userStore.findUserByUuid(uuid);
    // 用户不存在，让用户重新登录
    if (user === undefined) {
        client.emit('recoverFail', {
            code: 101,
            message: '用户不存在，请重新登录',
        });
        return;
    }
    console.log(`${user.name} recover`);
    user.updateId(client.id);
    const response = {
        user,
        rooms: roomStore.getRooms(),
    };
    const { joinedRoomId } = user;
    client.emit('recoverSuccess', response);
}

module.exports = {
    handleLogin,
    handleLogout,
    handleRecover,
};
