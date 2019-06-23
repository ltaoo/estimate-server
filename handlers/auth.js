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
            message: '用户名已存在',
        });
        return;
    }
    const user = new User({
        client,
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

function handleRecover(client, { username }) {
    // 客户端要求恢复状态，说明是已经登录过，去 store 查询该用户是否真的登录过
    let user = userStore.findUserByName(username);
    // 用户不存在，让用户重新登录
    if (user === undefined) {
        client.emit('recoverFail', {
            message: '用户不存在，请重新登录',
        });
        return;
    }
    console.log(`${user.name} recover`);
    user.updateId(client.id);
    const data = {
        user,
        rooms: roomStore.getRooms(),
    };
    const { joinedRoomId } = user;
    client.join(joinedRoomId);
    client.emit('recoverSuccess', data);
}

module.exports = {
    handleLogin,
    handleLogout,
    handleRecover,
};
