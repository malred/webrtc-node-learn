const express = require('express');
const socket = require('socket.io');
const app = express();
let server = app.listen(4000, function () {
    console.log('server is running');
})
app.use(express.static("public"))

// 升级服务器,让它支持websocket 
const io = socket(server, {
    // 跨域
    cors: {
        origin: '*'
    }
});
// 监听连接事件
io.on("connection", function (socket) {
    // 每次重新连接都不一样
    console.log('websocket connected', socket.id);
    // 处理客户端触发的事件
    socket.on('join', function (roomName) {
        // 房间号 -> 自动生成的
        let rooms = io.sockets.adapter.rooms
        let room = rooms.get(roomName)
        if (!room || room == undefined) {
            socket.join(roomName)
            // console.log('创建房间');
            // todo -> 添加一个对象,每次有新建立房间就同步房间到这个对象,实现大厅功能
            socket.emit("created")
        } else if (room.size == 1) {
            // 如果前端传递 房间最大连接数 就可以在这里动态设置人数上限
            socket.join(roomName)
            // console.log('加入房间');
            socket.emit("joined")
        } else {
            // console.log('房间已满');
            socket.emit("full")
        }
        console.log(rooms);
    })
    // 用户就绪
    socket.on("ready", function (roomName) {
        console.log('ready');
        // 触发指定房间的ready事件
        socket.broadcast.to(roomName).emit("ready")
    })
    // 用户接收就绪,并回复
    socket.on("candidate", function (candidate, roomName) {
        console.log('candidate');
        socket.broadcast.to(roomName).emit("candidate", candidate)
    })
    socket.on("offer", function (offer, roomName) {
        console.log('offer');
        socket.broadcast.to(roomName).emit("offer", offer)
    })
    socket.on("answer", function (answer, roomName) {
        console.log('answer');
        socket.broadcast.to(roomName).emit("answer", answer)
    })
    socket.on("leave", function (roomName) {
        // 离开房间
        socket.leave(roomName)
        // 广播,通知并触发leave事件
        socket.broadcast.to(roomName).emit("leave")
    })
}) 