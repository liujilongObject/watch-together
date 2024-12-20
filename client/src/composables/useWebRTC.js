const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
  // TODO 添加 TURN 服务器配置
  // {
  //   urls: 'turn:你的TURN服务器地址',
  //   username: '用户名',
  //   credential: '密码'
  // }
]

const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY = 5000

// 添加 ICE 重连处理
let reconnectAttempts = 0
const handleIceReconnect = async (peerConnection, socket, viewerId) => {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('ICE 重连失败,已达到最大尝试次数')
    return
  }
  try {
    console.log('开始 ICE 重连...')
    const offer = await peerConnection.createOffer({ 
      iceRestart: true,
      offerToReceiveAudio: true 
    })
    await peerConnection.setLocalDescription(offer)
    socket.emit('ice-restart', { offer, viewerId })
    reconnectAttempts++
  } catch (err) {
    console.error('ICE 重连失败:', err)
  }
}

export function initCaller(socket, localStream, remoteAudioRef) {
  console.log('initCaller');
  const peerConnections = new Map();

  socket.emit('broadcaster-ready');

  // 处理新观看者加入
  socket.on('viewer-joined', async (viewerId) => {
    console.log('新观看者加入:', viewerId)
    
    const peerConnection = new RTCPeerConnection({
      iceServers: ICE_SERVERS
    })

    // 添加本地媒体轨道
    if (localStream.value) {
      localStream.value.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream.value)
      })
    }
    
    // 处理 ICE 候选
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('broadcaster-ice', {
          candidate: event.candidate,
          viewerId
        })
      }
    }

    // 处理 ICE 重连
    peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE 连接状态:', peerConnection.iceConnectionState)
      
      if (peerConnection.iceConnectionState === 'disconnected') {
        console.log('检测到 ICE 断开,等待自动恢复...')
        
        // 等待 5 秒看是否自动恢复
        setTimeout(() => {
          if (peerConnection.iceConnectionState === 'disconnected') {
            console.log('ICE 未自动恢复,尝试重连...')
            handleIceReconnect(peerConnection, socket, viewerId)
          }
        }, RECONNECT_DELAY)
      }
    }

    // 处理接收到的媒体轨道
    peerConnection.ontrack = (event) => {
      console.log('房主收到媒体轨道:', event.streams[0])
      const stream = event.streams[0]
      const hasAudio = stream.getAudioTracks().length > 0

      if (hasAudio && remoteAudioRef.value) {
        remoteAudioRef.value.srcObject = stream
        remoteAudioRef.value.autoplay = true
        remoteAudioRef.value.playsInline = true
      }
    }

    // 创建并发送 offer
    try {
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      socket.emit('broadcaster-offer', { offer, viewerId })
    } catch (error) {
      console.error('创建 offer 失败:', error)
    }
    
    peerConnections.set(viewerId, peerConnection)
  })
  
  // 处理观看者的 answer
  socket.on('viewer-answer', async ({ answer, viewerId }) => {
    const peerConnection = peerConnections.get(viewerId)
    if (peerConnection) {
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
      } catch (error) {
        console.error('设置 answer 失败:', error)
      }
    }
  })

  // 处理观看者的 ICE 候选
  socket.on('viewer-ice', async ({ candidate, viewerId }) => {
    const peerConnection = peerConnections.get(viewerId)
    if (peerConnection) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (error) {
        console.error('添加 ICE 候选失败:', error)
      }
    }
  })
  
  // 处理观看者离开
  socket.on('viewer-left', (viewerId) => {
    const peerConnection = peerConnections.get(viewerId)
    if (peerConnection) {
      peerConnection.close()
      peerConnections.delete(viewerId)
    }
  })

  // 处理重连 answer
  socket.on('ice-restart-answer', async ({ answer, viewerId }) => {
    const peerConnection = peerConnections.get(viewerId)
    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
      console.log('ICE 重连完成')
    } catch (err) {
      console.error('处理 ICE 重连响应失败:', err)
    }
  })

  return function close() {
    peerConnections.forEach((peerConnection) => {
      peerConnection.close()
    })
    peerConnections.clear()
    socket.emit('broadcaster-stop')
  }
}

export function initReceiver(socket, localStream, remoteAudioRef) {
  let peerConnection = null;
  
  const createPeerConnection = () => {
    // 如果已存在连接，先关闭
    if (peerConnection) {
      peerConnection.close()
    }

    peerConnection = new RTCPeerConnection({
      iceServers: ICE_SERVERS
    })

    // 添加本地流
    if (localStream.value) {
      localStream.value.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream.value)
      })
    }

    // 处理远程流
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams
      console.log('观众收到媒体轨道:', remoteStream)
      if (remoteAudioRef.value) {
        remoteAudioRef.value.srcObject = remoteStream
        remoteAudioRef.value.autoplay = true
        remoteAudioRef.value.playsInline = true
      }
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('viewer-ice', { candidate: event.candidate })
      }
    }
  }

  socket.on('broadcaster-offer', async ({ offer }) => {
    // 确保在处理 offer 前创建新的连接
    createPeerConnection()

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      socket.emit('viewer-answer', { answer })
    } catch (error) {
      console.error('处理 offer 失败:', error)
    }
  })

  socket.on('broadcaster-ice', async ({ candidate }) => {
    if (!peerConnection) return
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (error) {
      console.error('添加 ICE 候选失败:', error)
    }
  })

  socket.emit('viewer-join')

  // 处理广播者停止广播
  socket.on('broadcaster-inactive', () => {
    close()
  })

  // 在 initReceiver 中添加重连响应处理
  socket.on('ice-restart-request', async ({ offer }) => {
    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      socket.emit('ice-restart-response', { answer })
    } catch (err) {
      console.error('处理 ICE 重连请求失败:', err)
    }
  })

  function close() {
    if (peerConnection) {
      peerConnection.close()
      peerConnection = null
    }
  }

  return close
}

