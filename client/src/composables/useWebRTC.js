export function initCaller(socket, localStream, remoteAudioRef) {
  console.log('initCaller');
  const peerConnections = new Map();

  socket.emit('broadcaster-ready');

  // 处理新观看者加入
  socket.on('viewer-joined', async (viewerId) => {
    console.log('新观看者加入:', viewerId)
    
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
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

    // 处理接收到的媒体轨道
    peerConnection.ontrack = (event) => {
      console.log('房主收到媒体轨道:', event.streams[0])
      const stream = event.streams[0]
      const hasAudio = stream.getAudioTracks().length > 0

      if (hasAudio && remoteAudioRef.value) {
        remoteAudioRef.value.srcObject = stream
        remoteAudioRef.value.autoplay = true
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

  return function close() {
    peerConnections.forEach((peerConnection, viewerId) => {
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
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
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

  function close() {
    if (peerConnection) {
      peerConnection.close()
      peerConnection = null
    }
  }

  return close
}

