class User {
    constructor(params) {
        const { id, name, client } = params;
        const clientKey = Symbol('client');
        this.id = id;
        this.name = name;
        this[clientKey] = client;
    }
    
    createRoom(room) {
        const { id } = room;
        this.isAdmintor = true;
        this.createdRoomId = id;

        room.addMember(this);
    }
}

module.exports = User;
