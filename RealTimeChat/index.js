const express = require('express');
const cors = require('cors')
const socket = require('socket.io')
var app = express()
app.use(express.static('public'))
app.use(cors())
var server = app.listen(4000, function () {
    console.log('listening to port 4000');
})
const upgradedServer = socket(server, {
    // 跨域
    cors: {
        origin: '*'
    }
});

// 升级服务器,让它支持websocket
// var upgradedServer = socket(server)

// 监听连接事件
upgradedServer.on("connection", function (socket) {
    // 每次重新连接都不一样
    console.log('websocket connected', socket.id);
    // 处理客户端触发的事件
    socket.on('sendingMessage', function (data) {
        console.log(data);
        // 广播给其他客户端
        upgradedServer.emit('broadcastMessage', data);
    })
})
