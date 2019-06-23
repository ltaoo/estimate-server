const userStore = require('../userStore');
const roomStore = require('../roomStore');
const Room = require('../Room');
const utils = require('../utils');
const io = require('../io');

function handleStartEstimate(client) {
    console.log('start estimate event');
    const { id } = client;
    const user = userStore.findUser(id);
    const { joinedRoomId: roomId } = user;
    if (roomId === null) {
        client.emit('startEstimateFail', { message: '用户没有加入房间' });
        return;
    }
    const room = roomStore.findRoom(roomId);
    if (!room) {
        client.emit('startEstimateFail', { message: `房间 ${roomId} 不存在` });
        return;
    }
    client.join(roomId);
    // 房间里的人都要开始
    room.members.forEach(u => {
        u.startEstimate();
    });
    room.updateStatus(Room.STATUS.STARTED);
    client.emit('startEstimateSuccess', { user, room });
    io.sockets.to(roomId).emit('globalStartEstimateSuccess', { room });
}

function handleBackEstimate(client) {
    const { id } = client;
    const user = userStore.findUser(id);
    const { joinedRoomId } = user;
    const room = roomStore.findRoom(joinedRoomId);
    room.addMember(user);
    client.emit('backEstimateSuccess', { user, room });
    io.sockets.to(joinedRoomId).emit('globalBackEstimateSuccess', {
        user,
        room,
        // 房间内所有成员都给出了估时，就通知客户端可以展示估时
        showEstimate: room.members.every(user => user.estimate !== null),
    });
}

function handleEstimate(client, { value }) {
    const { id } = client;
    const user = userStore.findUser(id);
    const { joinedRoomId: roomId } = user;
    if (roomId === null) {
        console.log(`${user.name} 未加入房间`);
        client.emit('estimateFail', { message: `${user.name} 未加入房间` });
        return;
    }
    const room = roomStore.findRoom(roomId);
    if (room === undefined) {
        client.emit('estimateFail', { message: `${roomId} 房间不存在` });
        return;
    }
    console.log(`${user.name} give estimate ${value}`);
    user.updateEstimate(value);
    const { members } = room;
    console.log('emit global estimate success', roomId);
    client.emit('estimateSuccess', { user, room });
    io.sockets.to(roomId).emit('globalEstimateSuccess', {
        user,
        room,
        // 房间内所有成员都给出了估时，就通知客户端可以展示估时
        showEstimate: members.every(user => user.estimate !== null),
    });
}

/**
 * 用户选择估时后，又返回重新选择，这时候应该清空之前的估时
 * @param {*} client 
 * @param {*} param1 
 */
function handleClearEstimate(client) {
    const { id } = client;
    const user = userStore.findUser(id);
    // 如果是在估时页面关闭，也会触发该事件
    if (user === undefined) {
        return;
    }
    const { joinedRoomId } = user;
    const room = roomStore.findRoom(joinedRoomId);
    user.clearEstimate();
    client.emit('clearEstimateSuccess', { user, room });
    io.sockets.to(joinedRoomId).emit('globalClearEstimateSuccess', { user, room });
}

function handleShowResult(client) {
    const { id } = client;
    const user = userStore.findUser(id);
    const { joinedRoomId: roomId } = user;
    if (roomId === null) {
        console.log(`${user.name} 未加入房间`);
        client.emit('showEstimateResultFail', { message: `${user.name} 未加入房间` });
        return;
    }
    const room = roomStore.findRoom(roomId);
    const estimates = room.members.map((member) => {
        return {
            id: member.id,
            name: member.name,
            estimate: member.estimate,
        };
    });
    room.members.forEach((member) => {
        member.clearEstimate();
        member.updateShowResult(true);
    });
    client.emit('showEstimateResultSuccess', { user });
    io.sockets.to(roomId).emit('globalShowEstimateResultSuccess', { estimates });
}

function handleRestartEstimate(client) {
    const { id } = client;
    const user = userStore.findUser(id);
    const { joinedRoomId: roomId } = user;
    if (roomId === null) {
        console.log(`${user.name} 未加入房间`);
        client.emit('restartEstimateFail', { message: `${user.name} 未加入房间` });
        return;
    }
    const room = roomStore.findRoom(roomId);
    room.members.forEach(member => {
        member.resetEstimate();
    });
    client.emit('globalRestartEstimateSuccess');
    io.sockets.to(roomId).emit('globalRestartEstimateSuccess');
}

function handleStopEstimate(client) {
    const { id } = client;
    const user = userStore.findUser(id);
    const { joinedRoomId: roomId } = user;
    if (roomId === null) {
        console.log(`${user.name} 未加入房间`);
        client.emit('stopEstimateFail', { message: `${user.name} 未加入房间` });
        return;
    }
    const room = roomStore.findRoom(roomId);
    room.members.forEach(member => {
        member.stopEstimate();
    });
    removeRoom(roomId);
    client.emit('stopEstimateSuccess');
    io.sockets.to(roomId).emit('globalStopEstimateSuccess');
}

module.exports = {
    handleStartEstimate,
    handleBackEstimate,
    handleEstimate,
    handleClearEstimate,
    handleShowResult,
    handleRestartEstimate,
    handleStopEstimate,
}