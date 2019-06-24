module.exports = (function utils() {
    let globalRooms = [];
    function getRooms() {
        return globalRooms;
    }
    function addRoom(room) {
        globalRooms.push(room);
    }
    /**
     * @param {String} id - 房间 id
     */
    function findRoom(id) {
        const room = globalRooms.find(r => r.id === id);
        return room;
    }
    /**
     * @param {String} id - 房间 id
     */
    function removeRoom(id) {
        globalRooms = globalRooms.filter(r => r.id !== id);
    }
    return {
        getRooms,
        addRoom,
        findRoom,
        removeRoom,
    };
}());
