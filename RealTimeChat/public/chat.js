var socket = io.connect("http://localhost:4000")

var message = document.getElementById('message')
var button = document.getElementById('send')
var username = document.getElementById('username')
var output = document.getElementById('output')

button.addEventListener('click', function () {
    // 触发自定义事件
    socket.emit('sendingMessage', {
        'message': message.value,
        'username': username.value
    })
})

socket.on('broadcastMessage', function (data) {
    // 显示消息到页面
    output.innerHTML +=
        `<p><strong>${data.username}:</strong>${data.message}</p>`
})