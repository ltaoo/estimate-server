function noop() {}

const genRoomId = (function util() {
    let roomId = 0;
    return () => {
        roomId += 1;
        return String(roomId);
    };
}());

module.exports = {
    noop,
    genRoomId,
};
