const userStore = require('../store/userStore');
const roomStore = require('../store/roomStore');
const Room = require('../domain/Room');
const utils = require('../utils');
const io = require('../io');

const { genRoomId } = utils;
/**
 * @param {Client} client - 客户端
 */
function handleCreateRoom(client) {
    console.log('create room');
    const { id } = client;
    const creator = userStore.findUser(id);
    if (!creator) {
        client.emit('createRoomFail', { code: 203, message: `用户 ${id} 不存在` });
        return;
    }
    const { createdRoomId } = creator;
    if (createdRoomId !== null) {
        client.emit('createRoomFail', { code: 204, message: `已创建房间 ${createdRoomId}` });
        return;
    }
    const roomId = genRoomId();
    const newRoom = new Room({ id: roomId, admintor: creator });
    roomStore.addRoom(newRoom);

    client.join(roomId);
    // 如果真的要表达 user create room，就应该将 new Room 放到该方法中
    creator.createRoom(newRoom);
    client.emit('createRoomSuccess', {
        user: creator,
        room: newRoom,
    });
    client.emit('joinRoomSuccess', {
        user: creator,
        room: newRoom,
    });
    // 全局广播，让客户端更新大厅的房间列表
    client.emit('globalCreateRoomSuccess', {
        rooms: roomStore.getRooms(),
    });
}

/**
 * 客户端加入房间
 * @param {Client} client
 * @param {string} roomId - 要加入的房间 id
 */
function handleJoinRoom(client, { roomId } = {}) {
    const { id } = client;
    const user = userStore.findUser(id);
    if (user === undefined) {
        client.emit('joinRoomFail', { code: 200, message: `用户 ${id} 不存在` });
        return;
    }
    const { joinedRoomId } = user;
    if (joinedRoomId !== null) {
        client.emit('joinRoomFail', { code: 201, message: `已经加入了 ${joinedRoomId} 房间` });
        return;
    }
    console.log(`${user.name} join room ${roomId}`);
    const room = roomStore.findRoom(roomId);
    if (!room) {
        client.emit('joinRoomFail', {
            code: 202,
            message: `房间 ${roomId} 不存在`,
        });
        return;
    }
    // 估时开始后有人想加入，需要兼容该情况。如果实在不好处理就禁止中途加入，人为重新建房间
    // if (room.status === Room.STATUS.STARTED) {
    //     const errorMessage = { type: 'joinRoom', message: `${roomId} 已经开始估时` };
    //     client.emit('err', errorMessage);
    //     return;
    // }
    user.joinRoom(room);
    client.join(roomId);
    // 检查是不是重复加入房间了
    if (!room.members.find(member => member.name === user.name)) {
        room.addMember(user);
    }
    client.emit('joinRoomSuccess', {
        user,
        room,
    });
    io.sockets.to(roomId).emit('globalJoinRoomSuccess', {
        user,
        room,
    });
}

function handleLeaveRoom(client) {
    const { id } = client;
    const user = userStore.findUser(id);
    if (!user) {
        client.emit('leaveRoomFail', { message: `${id} 用户不存在` });
        return;
    }
    const { joinedRoomId: roomId } = user;
    if (roomId === null) {
        return;
    }
    const room = roomStore.findRoom(roomId);
    if (!room) {
        client.emit('leaveRoomFail', { message: `${roomId} 房间不存在` });
        return;
    }
    // if (room.members.length === 1) {
    //     // @TODO 直接从全局移除，这个房间在 io 对象上还存在吗？
    //     removeRoom(roomId);
    //     io.emit('updateRooms', { rooms: getRooms() });
    // }
    user.leaveRoom();
    room.removeMember(user);
    console.log(`${user.name} leave room ${roomId}`);
    client.emit('leaveRoomSuccess', {
        user,
        room,
    });
    io.sockets.to(roomId).emit('globalLeaveRoomSuccess', {
        user,
        room,
    });
}

module.exports = {
    handleCreateRoom,
    handleJoinRoom,
    handleLeaveRoom,
};
