const cuid = require('cuid');
/**
 * ----------------------------
 * | id | name | joinedRoomId |
 */
class User {
    constructor(params) {
        const { id, name } = params;
        // 这个 id 是用来根据 client.id 从 userStore 查询用户的
        this.id = id;
        this.uuid = cuid();
        this.name = name;
        // 加入的房间
        this.joinedRoomId = null;
        // 自己创建的房间，大部分情况下和 joinedRoomId 是相同的
        this.createdRoomId = null;
        // 下面三个状态用于估时后在哪个页面
        // 是否正在估时
        this.estimating = false;
        // 是否给出了估时
        this.estimate = null;
        // 是否在结果页
        this.showResult = false;
    }

    updateId(id) {
        this.id = id;
    }

    createRoom(room) {
        const { id } = room;
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

    updateShowResult() {
        this.showResult = true;
    }

    clearEstimate() {
        this.estimate = null;
    }

    updateEstimate(value) {
        this.estimate = value;
    }

    resetEstimate() {
        this.estimate = null;
    }

    stopEstimate() {
        this.estimate = null;
        this.joinedRoomId = null;
        this.createdRoomId = null;
        this.estimating = false;
        this.showResult = false;
    }
}

module.exports = User;
