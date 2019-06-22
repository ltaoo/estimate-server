const User = require('../User');
const userStore = require('../userStore');
const roomStore = require('../roomStore');
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

module.exports = {
    handleLogin,
    handleLogout,
};
