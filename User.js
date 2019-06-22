const cuid = require('cuid');
/**
 * ----------------------------
 * | id | name | joinedRoomId |
 */
class User {
    constructor(params) {
        const { name } = params;
        this.id = cuid();
        this.name = name;
        // 加入的房间
        this.joinedRoomId = null;
        // 自己创建的房间，大部分情况下和 joinedRoomId 是相同的
        this.createdRoomId = null;
        // 是否正在估时
        this.estimating = false;
        this.estimate = null;
    }
    
    createRoom(room) {
        const { id } = room;
        this.isAdmintor = true;
        this.createdRoomId = id;

        room.addMember(this);
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
