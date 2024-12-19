<template>
  <div class="flex flex-col h-full bg-white rounded-lg shadow-md">
    <!-- 通话状态提示 -->
    <div v-if="callStatus" 
      class="sticky top-2 left-0 right-0 mx-auto w-fit px-4 py-2 
      bg-blue-500 text-white rounded-full text-sm">
      {{ callStatus }}
    </div>
    
    <!-- 消息列表 -->
    <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-3">
      <div 
        v-for="msg in messages" 
        :key="msg.id" 
        class="flex flex-col max-w-90% group"
        :class="msg.userId === userId ? 'items-end' : 'items-start'"
      >
        <!-- 消息元信息 -->
        <div class="flex items-center gap-2 text-xs text-gray-500 mb-1">
          <span class="font-medium">{{ formatUserId(msg.userId) }}</span>
          <span class="opacity-60">{{ formatTime(msg.timestamp) }}</span>
        </div>
        
        <!-- 消息内容 -->
        <div 
          class="px-4 py-2 rounded-2xl shadow-sm transition-all duration-200"
          :class="[
            msg.userId === userId 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-gray-100 hover:bg-gray-200'
          ]"
        >
          {{ msg.content }}
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="flex items-center gap-2 p-4 border-t border-gray-100">
      <input 
        v-model="newMessage" 
        @keyup.enter="sendMessage"
        placeholder="边看边聊，发送消息..."
        type="text"
        class="
          flex-1 px-4 py-2 
          bg-gray-100 
          rounded-full
          border-2 border-transparent
          outline-none
          transition-all duration-200
          placeholder:text-gray-400
          focus:bg-white
          focus:border-blue-500
        "
      >
      <button 
        @click="sendMessage" 
        :disabled="!newMessage.trim()"
        class="
          i-material-symbols-send
          w-10 h-10
          rounded-full
          flex items-center justify-center
          text-white
          bg-blue-500
          transition-all duration-200
          hover:bg-blue-600
          disabled:bg-gray-300
          disabled:cursor-not-allowed
        "
      />
      <!-- <button
        v-if="isOwner"
        @click="launchCall"
        title="语音通话"
        :class="[
          isCalling ? 'bg-red-500' : 'bg-green-500',
          isCalling ? 'i-material-symbols-phone-in-talk' : 'i-material-symbols-call',
          'w-10 h-10',
          'flex items-center justify-center',
          'transition-all duration-200',
          'cursor-pointer',
          'text-white',
        ]"
      /> -->

      <button
        v-if="isCalling"
        @click="toggleMic"
        :title="isMicOpen ? '关闭麦克风' : '打开麦克风'"
        :class="[
          isMicOpen ? 'i-material-symbols-Mic' : 'i-material-symbols-Mic-off',
          'w-10 h-10',
          'flex items-center justify-center',
          'transition-all duration-200',
          'cursor-pointer',
          isMicOpen ? 'bg-green-500' : 'bg-orange-500',
          'text-white',
        ]"
      />

      <audio ref="remoteAudioRef" controls class="hidden" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, onUnmounted } from 'vue';
import axios from 'axios';
import { useSocket } from '../composables/useSocket';
import { initCaller, initReceiver } from '../composables/useWebRTC';
import { showDialog } from '../utils/dialog'

const props = defineProps({
  isOwner: { type: Boolean, required: true },
  roomId: { type: String, required: true },
  userId: { type: String, required: true }
});

const socket = useSocket();
const messages = ref([]);
const newMessage = ref('');
const messagesContainer = ref(null);

const getLocalStream = async () => {
  const audioStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false
  }).catch(err => console.log(err))

  console.log('创建通话状态:', !!audioStream)
  
  return audioStream;
}

// 切换麦克风
const isMicOpen = ref(false)
const toggleMic = () => {
  isMicOpen.value = !isMicOpen.value
  
  if (localStream.value) {
    localStream.value.getAudioTracks().forEach(track => {
      track.enabled = isMicOpen.value
    })
  }
}

const remoteAudioRef = ref(null);
const isCalling = ref(false);
let closeCallFn = null
let localStream = ref(null)

const callStatus = ref(null);

// 简单的状态提示函数
const setCallStatus = (message, duration = 3000) => {
  callStatus.value = message;
  if (duration) {
    setTimeout(() => {
      callStatus.value = null;
    }, duration);
  }
};

// 发起语音通话
const launchCall = async () => {
  if (isCalling.value) {
    clearCall();
    return;
  }

  localStream.value = await getLocalStream();
  if (!localStream.value) {
    showDialog({
      title: '错误',
      message: '无法访问麦克风',
      showCancel: false
    });
    return;
  }
  
  // 设置初始状态为开启
  isMicOpen.value = true;
  localStream.value.getAudioTracks().forEach(track => {
    track.enabled = true;
  });
  
  // 根据角色初始化不同的处理函数
  if (props.isOwner) {
    setCallStatus('正在准备通话...', 0);
    closeCallFn = initCaller(socket, localStream, remoteAudioRef);
    setCallStatus('等待观众加入...', 0);
  } else {
    closeCallFn = initReceiver(socket, localStream, remoteAudioRef);
    setCallStatus('正在加入通话...', 0);
  }

  isCalling.value = true;
};

const clearCall = () => {
  if (localStream.value) {
    localStream.value.getTracks().forEach(track => track.stop())
    localStream.value = null
  }
  closeCallFn?.()
  isCalling.value = false
  isMicOpen.value = false
}

// 发送消息
const sendMessage = () => {
  if (!newMessage.value.trim()) return;
  
  socket.emit('send-message', {
    roomId: props.roomId,
    content: newMessage.value,
    userId: props.userId
  });
  
  newMessage.value = '';
};

// 格式化用户ID显示
const formatUserId = (userId) => {
  return `用户${userId.substring(0, 4)}`;
};

// 格式化时间显示
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
};

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

onMounted(async () => {
  // 加载历史消息
  try {
    const response = await axios.get(`/api/messages/room/${props.roomId}`);
    messages.value = response.data.reverse(); // 反转消息顺序以保持时间正序
    await scrollToBottom();
  } catch (err) {
    console.error('加载历史消息失败:', err);
  }

  // 监听新消息
  socket.on('new-message', (message) => {
    messages.value.push(message);
    scrollToBottom();
  });

  socket.on('room-users-update', (data) => {
    if (props.isOwner && isCalling.value && data.count > 1) {
      setCallStatus(`${data.count - 1}人已加入`);
    }
  });

  // 如果当前用户是观众,则自动发起通话
  if (!isCalling.value) {
    await launchCall()
  }
});

// 组件卸载时清理
onUnmounted(() => {
  clearCall()
});
</script> 