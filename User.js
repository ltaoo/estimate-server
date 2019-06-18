/**
 * ----------------------------
 * | id | name | joinedRoomId |
 */
class User {
    constructor(params) {
        const { id, name, client } = params;
        this.id = id;
        this.name = name;
        // 加入的房间
        this.joinedRoomId = null;
        // 自己创建的房间，大部分情况下和 joinedRoomId 是相同的
        this.createdRoomId = null;

        this.estimate = null;

        // const clientKey = Symbol('client');
        // this[clientKey] = client;
    }

    updateClient(client) {
        this.id = client.id;
    }
    
    createRoom(room) {
        const { id } = room;
        this.isAdmintor = true;
        this.createdRoomId = id;

        room.addMember(this);
    }

    updateEstimate(value) {
        this.estimate = value;
    }
}

module.exports = User;
