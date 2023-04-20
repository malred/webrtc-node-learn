var socket = io.connect("http://localhost:4000")

var divVideoChatLobby = document.getElementById('video-chat-lobby');
var divVideoChat = document.getElementById('video-chat-room');
var joinButton = document.getElementById('join')
var userVideo = document.getElementById('user-video');
var peerVideo = document.getElementById('peer-video')
var roomInput = document.getElementById('rname')
var roomName // 这里如果提取获取输入框的内容,会是空串 '' 

var btnGroup = document.getElementById('btn-group')
var muteBtn = document.getElementById('muteBtn')
var leaveBtn = document.getElementById('leaveBtn')
var hideBtn = document.getElementById('hideBtn')
var muteFlag = false
var hideFlag = false


// 创建者
var creator = false

var rtcPeerConnection

var userStream // 用户视频流

// 帮助服务器找到ip和通信设备
var iceServers = {
    iceServers: [
        { urls: 'stun:stun.services.mozilla.com' },
        { urls: 'stun:stun.schlund.de' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
}

// 老的浏览器可能根本没有实现 mediaDevices，所以我们可以先设置一个空的对象
if (navigator.mediaDevices === undefined) {
    navigator.mediaDevices = {};
}

// 一些浏览器部分支持 mediaDevices。我们不能直接给对象设置 getUserMedia
// 因为这样可能会覆盖已有的属性。这里我们只会在没有 getUserMedia 属性的时候添加它。
if (navigator.mediaDevices.getUserMedia === undefined) {
    navigator.mediaDevices.getUserMedia = function (constraints) {

        // 首先，如果有 getUserMedia 的话，就获得它
        var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        // 一些浏览器根本没实现它 - 那么就返回一个 error 到 promise 的 reject 来保持一个统一的接口
        if (!getUserMedia) {
            return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
        }

        // 否则，为老的 navigator.getUserMedia 方法包裹一个 Promise
        return new Promise(function (resolve, reject) {
            getUserMedia.call(navigator, constraints, resolve, reject);
        });
    }
}


// 想要获取一个最接近 1280x720 的相机分辨率
var constraints = {
    audio: true, // 是否开启声音
    video: { width: 500, height: 500 }
    // video: true
};

function openVideo() {
    // navigator.getUserMedia({ // 已弃用 
    navigator.mediaDevices.getUserMedia(constraints)
        .then(function (mediaStream) {
            userStream = mediaStream
            // 输入房间号的框消失 
            divVideoChatLobby.style = 'display:none'
            // 按钮出现
            btnGroup.style = 'display:flex'
            // 接收视频流
            userVideo.srcObject = mediaStream;
            userVideo.onloadedmetadata = function (e) {
                userVideo.play();
            };
            socket.emit('ready', roomName)
        })
        .catch(function (err) { console.log(err.name + ": " + err.message); }); // 总是在最后检查错误
}
joinButton.addEventListener('click', function () {
    roomName = roomInput.value
    if (roomName == '') {
        alert("请输入要加入的房间号")
    } else {
        // socket 加入房间
        socket.emit('join', roomName) // -> 多传递一个 房间最大人数 的数据,创建不同容量的房间
    }
})
// 静音
muteBtn.addEventListener('click', function () {
    muteFlag = !muteFlag
    if (muteFlag) {
        userStream.getTracks()[0].enabled = false
        muteBtn.textContent = 'unmute'
    } else {
        userStream.getTracks()[0].enabled = true
        muteBtn.textContent = 'mute'
    }
})
leaveBtn.addEventListener('click', function () {
    // 触发离开事件
    socket.emit('leave', roomName)
    // 输入房间号的框消失 
    divVideoChatLobby.style = 'display:block'
    // 按钮消失
    btnGroup.style = 'display:none'
    // 关闭视频
    if (userVideo.srcObject) {
        // userVideo.srcObject.getTracks()[0].stop()
        // userVideo.srcObject.getTracks()[1].stop()
        userVideo.srcObject.getTracks().forEach(track => track.stop());
    }
    if (peerVideo.srcObject) {
        // peerVideo.srcObject.getTracks()[0].stop()
        // peerVideo.srcObject.getTracks()[1].stop()
        peerVideo.srcObject.getTracks().forEach(track => track.stop());
    }
    // 关闭连接
    if (rtcPeerConnection) {
        rtcPeerConnection.ontrack = null
        rtcPeerConnection.onicecandidate = null
        rtcPeerConnection.close()
        rtcPeerConnection = null
    }
})
// 广播的leave事件
socket.on('leave', function () {
    // 关闭连接
    if (rtcPeerConnection) {
        rtcPeerConnection.ontrack = null
        rtcPeerConnection.onicecandidate = null
        rtcPeerConnection.close()
        rtcPeerConnection = null
    }
    if (peerVideo.srcObject) {
        // peerVideo.srcObject.getTracks()[0].stop()
        // peerVideo.srcObject.getTracks()[1].stop()
        peerVideo.srcObject.getTracks().forEach(track => track.stop());
    }
})
hideBtn.addEventListener('click', function () {
    hideFlag = !hideFlag
    if (hideFlag) {
        // 关闭视频
        userStream.getTracks()[1].enabled = false
        hideBtn.textContent = 'show'
    } else {
        // 显示视频
        userStream.getTracks()[1].enabled = true
        hideBtn.textContent = 'hide'
    }
})
function OnIceCandidateFunction(event) {
    if (event.candidate) {
        socket.emit('candidate', event.candidate, roomName)
    }
}
function OnTrackFunction(event) {
    // 显示其他用户的视频流 -> 如果有指定房间人数,是否可以创建视频,然后动态显示窗口 
    // 接收视频流
    peerVideo.srcObject = event.streams[0];
    peerVideo.onloadedmetadata = function (e) {
        peerVideo.play();
    };
}
// 房间创建
socket.on('created', function () {
    // 房间的创建者
    creator = true
    openVideo()
})
// 进入房间
socket.on('joined', function () {
    creator = false
    openVideo()
})
// 房间已满
socket.on('full', function () {
    alert(`room is full,can't join`)
})
// 用户就绪
socket.on('ready', function () {
    // 创建者发送offer(自己的本地会话描述)给远程,远程answer自己的本地会话描述,
    // 他们又分别把对方的会话描述加入到自己的远程会话描述
    if (creator) {
        // 和远程用户建立连接 (是接口,提供抽象方法,但是没有实现)
        rtcPeerConnection = new RTCPeerConnection(iceServers)
        // 双方连接后,注册candidate
        rtcPeerConnection.onicecandidate = OnIceCandidateFunction
        // 尝试获取媒体流时触发
        rtcPeerConnection.ontrack = OnTrackFunction
        // 获取音频和视频流轨道
        rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream)
        rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream)
        console.log(userStream.getTracks());
        rtcPeerConnection.createOffer()
            .then(function (offer) {
                // 创建本地会话描述 SDP 
                rtcPeerConnection.setLocalDescription(offer)
                socket.emit('offer', offer, roomName)
                // return myPeerConnection.setLocalDescription(offer);
            })
            // .then(function () {
            //     sendToServer({
            //         name: myUsername,
            //         target: targetUsername,
            //         type: "video-offer",
            //         sdp: myPeerConnection.localDescription
            //     });
            // })
            .catch(function (reason) {
                // An error occurred, so handle the failure to connect
                console.log(reason);
            });
    }
})
socket.on('candidate', function (candidate) {
    var icecandidate = new RTCIceCandidate(candidate)
    rtcPeerConnection.addIceCandidate(icecandidate)
})
socket.on('offer', function (offer) {
    if (!creator) {
        // 和远程用户建立连接 (是接口,提供抽象方法,但是没有实现)
        rtcPeerConnection = new RTCPeerConnection(iceServers)
        // 双方连接后,注册candidate
        rtcPeerConnection.onicecandidate = OnIceCandidateFunction
        // 尝试获取媒体流时触发
        rtcPeerConnection.ontrack = OnTrackFunction
        // 获取用户的视频流轨道和其他用户的视频流轨道
        rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream)
        rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream)
        // 设置远程会话描述 SDP
        rtcPeerConnection.setRemoteDescription(offer)
        rtcPeerConnection.createAnswer()
            .then(function (answer) {
                // 创建本地会话描述 SDP 
                rtcPeerConnection.setLocalDescription(answer)
                socket.emit('answer', answer, roomName)
            })
            .catch(function (reason) {
                // An error occurred, so handle the failure to connect
                console.log(reason);
            });
    }
})
socket.on('answer', function (answer) {
    // 设置远程会话描述 SDP
    rtcPeerConnection.setRemoteDescription(answer)
}) 