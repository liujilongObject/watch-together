# 一起看

一个基于 Web 的实时视频同步观看应用(MVP)。让你可以和好友一起在线观看视频，支持同步播放、暂停和进度控制。支持聊天室和语音通话功能。

### 创建房间
![image](./assets/home.png)

### 房主视角
![image](./assets/owner_room.png)

### 观众视角
![image](./assets/visitor_room.png)


## 功能

- 🎥 创建观影房间
- 👥 多人实时同步观看
- 🎮 房主播放控制
- 🔄 观众进度同步
- 📋 一键复制房间链接分享
- 💬 实时聊天室
- 🎙️ 语音通话(实验性功能)

## 技术栈

- 前端: Vue 3 + Vite + UnoCSS
- 后端: Express + Socket.IO
- 数据库: MongoDB
- 语音通话: WebRTC

## 快速开始

### 克隆项目
```bash
git clone https://github.com/liujilongObject/watch-together.git
```

### 安装依赖
```bash
npm install
```

### 配置环境变量
```bash
MONGODB_URI=your_mongodb_uri # 数据库连接地址
```

### 快速启动服务

```bash
npm run start
```

### 访问应用
`http://localhost:7766`


## 使用方法

1. 在首页输入视频 URL 创建房间
2. 复制房间链接分享给好友
3. 房主可以控制视频播放/暂停
4. 观众可以点击同步按钮与房主进度保持一致
5. 进入房间，授权麦克风权限，即可开始语音通话


## 项目结构
```
├── client/ # 前端代码
│ ├── src/
│ │ ├── views/ # 页面组件
│ │ ├── components/ # 通用组件
│ │ └── utils/ # 工具函数
│ └── vite.config.js # Vite 配置
│
└── server/ # 后端代码
│ ├── index.js # 服务器入口
│ └── models/ # 数据模型
```


## 注意事项

- 仅支持可直接访问的视频文件 URL
- 建议使用现代浏览器访问
- 目前仅用于本地开发验证
- 未加入用户系统，房主身份默认存储在 `localStorage`，使用不同浏览器区分用户身份 (即使用不同的浏览器访问房间链接，模拟多设备同时观看视频。`PS: 也可以使用 sessionStorage 区分用户身份（修改环境变量 USER_IDENTITY 为 sessionStorage），在同一浏览器中打开不同标签页访问房间链接即可。`)
- 注意更新数据库连接地址 (本地 MongoDB 连接地址 或 远程 MongoDB 连接地址)
- 语音通话功能为实验性功能，建议在 chrome 浏览器中使用 （请求麦克风权限需在 localhost 域名 或 https 域名下）


## 时序图

### 创建房间&视频状态同步

```mermaid
sequenceDiagram
    participant 用户A as 房主
    participant 前端A as 房主客户端
    participant Socket as Socket.IO服务器
    participant Server as Express服务器
    participant DB as MongoDB
    participant 前端B as 观众客户端
    participant 用户B as 观众

    %% 创建房间流程
    用户A->>前端A: 输入视频URL
    前端A->>Server: POST /api/rooms
    Server->>DB: 创建房间记录
    DB-->>Server: 返回房间信息
    Server-->>前端A: 返回roomId和owner标识
    前端A->>前端A: 存储owner标识到localStorage
    
    %% 加入房间流程
    用户B->>前端B: 访问房间链接
    前端B->>Server: GET /api/rooms/{roomId}
    Server->>DB: 查询房间信息
    DB-->>Server: 返回房间数据
    Server-->>前端B: 返回房间信息
    
    %% WebSocket连接
    前端A->>Socket: 连接并join-room(房主)
    前端B->>Socket: 连接并join-room(观众)
    Socket-->>前端A: room-users-update
    Socket-->>前端B: room-users-update
    
    %% 视频控制流程
    用户A->>前端A: 播放/暂停视频
    前端A->>Socket: video-state-change事件
    Socket->>前端B: 广播video-state-update
    前端B->>前端B: 更新视频状态
    
    %% 同步请求流程
    用户B->>前端B: 点击同步按钮
    前端B->>Socket: request-sync事件
    Socket->>前端A: sync-request事件
    前端A->>Socket: sync-response事件
    Socket->>前端B: video-state-update事件
    前端B->>前端B: 同步视频状态

    %% 注释说明
    Note over 前端A,前端B: 实时同步视频状态
    Note over Socket: 处理房间内所有实时通信
    Note over 用户A,用户B: 房主控制播放，观众同步观看

```

### WebRTC 语音通话流程
```mermaid
sequenceDiagram
    participant B as 广播者
    participant S as Socket.IO 服务器(信令服务器)
    participant V as 观众
    Note over B: 创建 RTCPeerConnection
    Note over B: 获取本地音频流
    B->>S: broadcaster-ready
    S->>V: voice-call-started
    V->>S: viewer-join
    S->>B: viewer-joined (viewerId)
    Note over B: 添加本地音频轨道
    Note over B: createOffer()
    Note over B: setLocalDescription(offer)
    B->>S: broadcaster-offer (offer, viewerId)
    S->>V: broadcaster-offer (offer)
    Note over V: 创建 RTCPeerConnection
    Note over V: setRemoteDescription(offer)
    Note over V: createAnswer()
    Note over V: setLocalDescription(answer)
    V->>S: viewer-answer (answer)
    S->>B: viewer-answer (answer, viewerId)
    Note over B: setRemoteDescription(answer)
    Note over B,V: ICE 收集与交换
    B->>S: broadcaster-ice (candidate, viewerId)
    S->>V: broadcaster-ice (candidate)
    Note over V: addIceCandidate()
    V->>S: viewer-ice (candidate)
    S->>B: viewer-ice (candidate, viewerId)
    Note over B: addIceCandidate()
    Note over B,V: ICE 连接建立
    Note over B,V: P2P 连接成功
    B-->V: 音频数据流
    Note over V: ontrack 事件触发
    Note over V: 播放远程音频流
    Note over B,V: 连接状态监控
    rect rgb(200, 200, 200)
    Note over B,V: 断开连接处理
    B->>S: broadcaster-stop
    S->>V: broadcaster-inactive
    Note over V: 清理连接资源
    Note over B: 清理连接资源
    end
```


## 许可证

MIT
