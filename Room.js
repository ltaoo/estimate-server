const ENABLE = 'ENABLE';
const STARTED = 'STARTED';

class Room {
    constructor(params) {
        const { id, admintor } = params;
        this.id = id;
        this.status = ENABLE;
        this.members = [];

        this.setAdmintor(admintor);
    }

    setAdmintor(admintor) {
        this.admintor = admintor;
    }

    addMember(user) {
        this.members.push(user);
        user.joinedRoomId = this.id;
    }

    removeMember(user) {
        this.members = this.members.filter(member => member !== user);
    }
}

Room.STATUS = {
    ENABLE,
    STARTED,
};

module.exports = Room;