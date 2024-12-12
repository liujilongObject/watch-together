<template>
  <div class="flex flex-col h-full bg-white rounded-lg shadow-md">
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
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, onUnmounted } from 'vue';
import axios from 'axios';
import { useSocket } from '../composables/useSocket';

const props = defineProps({
  roomId: { type: String, required: true },
  userId: { type: String, required: true }
});

const socket = useSocket();
const messages = ref([]);
const newMessage = ref('');
const messagesContainer = ref(null);

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
});

// 组件卸载时清理
onUnmounted(() => {});
</script> 