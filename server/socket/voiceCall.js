export function initVoiceCallIO(io) {
  let broadcaster = null;

  io.on('connection', (socket) => {
    console.log('New voice call connection:', socket.id);

    // 广播者准备就绪
    socket.on('broadcaster-ready', () => {
      broadcaster = socket.id
      // 通知所有其他客户端广播开始
      socket.broadcast.emit('voice-call-started')
    })

    // 广播者停止广播
    socket.on('broadcaster-stop', () => {
      broadcaster = null
      // 通知所有其他客户端广播结束
      socket.broadcast.emit('broadcaster-inactive')
    })

    // 观看者请求加入
    socket.on('viewer-join', () => {
      if (broadcaster) {
        // 通知广播者有新观众加入,并传递观众ID
        io.to(broadcaster).emit('viewer-joined', socket.id)
      }
    })

    // WebRTC 信令交换相关事件处理

    // 广播者发送 offer
    socket.on('broadcaster-offer', ({ offer, viewerId }) => {
      // 将 offer 转发给特定的观看者
      io.to(viewerId).emit('broadcaster-offer', { offer })
    })

    // 观看者发送 answer
    socket.on('viewer-answer', ({ answer }) => {
      if (broadcaster) {
        // 将 answer 转发给广播者
        io.to(broadcaster).emit('viewer-answer', {
          answer,
          viewerId: socket.id
        })
      }
    })

    // ICE 候选信息交换
    socket.on('broadcaster-ice', ({ candidate, viewerId }) => {
      // 广播者的 ICE 候选转发给观看者
      io.to(viewerId).emit('broadcaster-ice', { candidate })
    })

    socket.on('viewer-ice', ({ candidate }) => {
      if (broadcaster) {
        // 观看者的 ICE 候选转发给广播者
        io.to(broadcaster).emit('viewer-ice', {
          candidate,
          viewerId: socket.id
        })
      }
    })

    // 处理断开连接
    socket.on('disconnect', () => {
      if (socket.id === broadcaster) {
        // 如果是广播者断开,清除广播者并通知所有人
        broadcaster = null
        socket.broadcast.emit('broadcaster-inactive')
      } else if (broadcaster) {
        // 如果是观看者断开,通知广播者清理对应连接
        io.to(broadcaster).emit('viewer-left', socket.id)
      }
    })

    // 处理 ICE 重连请求
    socket.on('ice-restart', ({ offer, viewerId }) => {
      console.log('收到 ICE 重连请求')
      io.to(viewerId).emit('ice-restart-request', { offer })
    })

    // 处理 ICE 重连响应
    socket.on('ice-restart-response', ({ answer }) => {
      console.log('收到 ICE 重连响应')
      if (broadcaster) {
        io.to(broadcaster).emit('ice-restart-answer', { answer, viewerId: socket.id })
      }
    })
  })
}
