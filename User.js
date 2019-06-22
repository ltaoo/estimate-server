const cuid = require('cuid');
/**
 * ----------------------------
 * | id | name | joinedRoomId |
 */
class User {
    constructor(params) {
        const { name, client } = params;
        // 这个 id 是用来根据 client.id 从 userStore 查询用户的
        this.id = client.id;
        this.uuid = cuid();
        this.name = name;
        // 加入的房间
        this.joinedRoomId = null;
        // 自己创建的房间，大部分情况下和 joinedRoomId 是相同的
        this.createdRoomId = null;
        // 是否正在估时
        this.estimating = false;
        this.estimate = null;
    }

    updateId(id) {
        this.id = id;
    }
    
    createRoom(room) {
        const { id } = room;
        this.isAdmintor = true;
        this.createdRoomId = id;

        room.addMember(this);
    }

    joinRoom(id) {
        this.joinedRoomId = id;
    }

    leaveRoom() {
        this.joinedRoomId = null;
    }

    startEstimate() {
        this.estimating = true;
    }

    updateEstimate(value) {
        this.estimate = value;
    }

    resetEstimate() {
        this.estimate = null;
    }

    stopEstimate() {
        this.estimate = null;
        this.estimating = true;
        this.joinedRoomId = null;
        this.createdRoomId = null;
    }
}

module.exports = User;
