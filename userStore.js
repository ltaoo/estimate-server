module.exports = (function () {
    // 一个全局的客户端存储，每个客户端表示一个用户，正常来说是保存到数据库比如 redis 中
    let globalUsers = [];
    function addUser(user) {
        globalUsers.push(user);
    }
    function findUser(id) {
        const user = globalUsers.find(u => u.id === id);
        return user;
    }
    function findUserByName(name) {
        return globalUsers.find(u => u.name === name);
    }
    function removeUser(id) {
        globalUsers = globalUsers.filter(user => user.id !== id);
    }
    return {
        addUser,
        findUser,
        findUserByName,
        removeUser,
    };
}());

