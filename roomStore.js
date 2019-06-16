const { getRooms, addRoom, findRoom, removeRoom } = (function () {
    let globalRooms = [];
    function getRooms() {
        return globalRooms;
    }
    function addRoom(room) {
        globalRooms.push(room);
    }
    function findRoom(id) {
        const room = globalRooms.find(r => r.id === id);
        return room;
    }
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

module.exports = {
    getRooms,
    addRoom,
    findRoom,
    removeRoom,
};
