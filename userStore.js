const { addUser, findUser, removeUser } = (function () {
    // 一个全局的客户端存储，每个客户端表示一个用户，正常来说是保存到数据库比如 redis 中
    let globalUsers = [];
    function addUser(user) {
        globalUsers.push(user);
    }
    function findUser(id) {
        const user = globalUsers.find(u => u.id === id);
        return user;
    }
    function removeUser(id) {
        globalUsers = globalUsers.filter(user => user.id !== id);
    }
    return {
        addUser,
        findUser,
        removeUser,
    };
}());

module.exports = {
    addUser,
    findUser,
    removeUser,
};
