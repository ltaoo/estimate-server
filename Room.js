const ENABLE = 'ENABLE';
const STARTED = 'STARTED';

/**
 * ----------------------------------
 * | id | status | creator |
 */
class Room {
    constructor(params) {
        const { id } = params;
        this.id = id;
        this.status = ENABLE;
        this.members = [];
    }

    setAdmintor(admintor) {
        this.admintor = admintor;
    }

    addMember(user) {
        this.members.push(user);
        /* eslint-disable no-param-reassign */
        user.joinedRoomId = this.id;
    }

    removeMember(user) {
        this.members = this.members.filter(member => member !== user);
    }

    updateStatus(nextStatus) {
        this.status = nextStatus;
    }
}

Room.STATUS = {
    ENABLE,
    STARTED,
};

module.exports = Room;
