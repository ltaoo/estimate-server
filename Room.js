class Room {
    constructor(params) {
        const { id } = params;
        this.id = id;
        this.status = false;
    }
}

module.exports = Room;