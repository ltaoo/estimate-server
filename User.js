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
        this.isAdmin = true;
        this.joinedRoomId = id;
    }
}

module.exports = User;
