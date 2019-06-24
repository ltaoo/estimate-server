const userStore = require('../store/userStore');
const roomStore = require('../store/roomStore');
const Room = require('../domain/Room');
const io = require('../io');

function handleStartEstimate(client) {
    console.log('start estimate event');
    const { id } = client;
    const user = userStore.findUser(id);
    const { joinedRoomId } = user;
    if (joinedRoomId === null) {
        client.emit('startEstimateFail', { code: 300, message: '用户没有加入房间' });
        return;
    }
    const room = roomStore.findRoom(joinedRoomId);
    if (!room) {
        client.emit('startEstimateFail', {
            code: 301,
            message: `房间 ${joinedRoomId} 不存在`,
        });
        return;
    }
    // 房间里的人都要开始
    room.members.forEach((member) => {
        member.startEstimate();
    });
    room.updateStatus(Room.STATUS.STARTED);
    client.emit('startEstimateSuccess', { user, room });
    io.sockets.to(joinedRoomId).emit('globalStartEstimateSuccess', { room });
}

/**
 * 客户端给出估时
 * @param {Client} client
 * @param {number} value - 估时的点数
 */
function handleEstimate(client, { value }) {
    const { id } = client;
    const user = userStore.findUser(id);
    const { joinedRoomId } = user;
    if (joinedRoomId === null) {
        console.log(`${user.name} 未加入房间`);
        client.emit('estimateFail', {
            code: 302,
            message: `${user.name} 未加入房间`,
        });
        return;
    }
    const room = roomStore.findRoom(joinedRoomId);
    if (room === undefined) {
        client.emit('estimateFail', {
            code: 303,
            message: `${joinedRoomId} 房间不存在`,
        });
        return;
    }
    console.log(`${user.name} give estimate ${value}`);
    user.updateEstimate(value);
    const { members } = room;
    const response = { user, room };
    client.emit('estimateSuccess', response);
    io.sockets.to(joinedRoomId).emit('globalEstimateSuccess', {
        user,
        room,
        // 房间内所有成员都给出了估时，就通知客户端可以展示估时
        showEstimate: members.every(member => member.estimate !== null),
    });
}

/**
 * 用户选择估时后，又返回重新选择，这时候应该清空之前的估时
 * @param {Client} client
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

/**
 * 组长展示估时结果
 * @param {Client} client
 */
function handleShowResult(client) {
    const { id } = client;
    const user = userStore.findUser(id);
    const { joinedRoomId } = user;
    if (joinedRoomId === null) {
        console.log(`${user.name} 未加入房间`);
        client.emit('showEstimateResultFail', {
            code: 304,
            message: `${user.name} 未加入房间`,
        });
        return;
    }
    const room = roomStore.findRoom(joinedRoomId);
    const estimates = room.members.map(member => ({
            id: member.id,
            name: member.name,
            estimate: member.estimate,
        }));
    room.members.forEach((member) => {
        // member.clearEstimate();
        member.updateShowResult(true);
    });
    client.emit('showEstimateResultSuccess', { user, estimates });
    io.sockets.to(joinedRoomId).emit('globalShowEstimateResultSuccess', { user, estimates });
}

/**
 * 重新开始估时
 * @param {Client} client
 */
function handleRestartEstimate(client) {
    const { id } = client;
    const user = userStore.findUser(id);
    const { joinedRoomId } = user;
    if (joinedRoomId === null) {
        console.log(`${user.name} 未加入房间`);
        client.emit('restartEstimateFail', {
            code: 305,
            message: `${user.name} 未加入房间`,
        });
        return;
    }
    const room = roomStore.findRoom(joinedRoomId);
    room.members.forEach((member) => {
        member.resetEstimate();
    });
    client.emit('globalRestartEstimateSuccess');
    io.sockets.to(joinedRoomId).emit('globalRestartEstimateSuccess');
}

/**
 * 结束估时
 * @param {Client} client
 */
function handleStopEstimate(client) {
    const { id } = client;
    const user = userStore.findUser(id);
    const { joinedRoomId } = user;
    if (joinedRoomId === null) {
        console.log(`${user.name} 未加入房间`);
        client.emit('stopEstimateFail', {
            code: 306,
            message: `${user.name} 未加入房间`,
        });
        return;
    }
    const room = roomStore.findRoom(joinedRoomId);
    room.members.forEach((member) => {
        member.stopEstimate();
    });
    roomStore.removeRoom(joinedRoomId);
    client.emit('stopEstimateSuccess');
    io.sockets.to(joinedRoomId).emit('globalStopEstimateSuccess');
}

module.exports = {
    handleStartEstimate,
    handleEstimate,
    handleClearEstimate,
    handleShowResult,
    handleRestartEstimate,
    handleStopEstimate,
};
