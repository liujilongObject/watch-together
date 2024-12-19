<template>
  <div class="min-h-screen bg-gray-100">
    <div class="max-w-7xl mx-auto p-4 space-y-4">
      <!-- 顶部卡片 -->
      <div class="bg-white rounded-xl shadow-sm p-4">
        <div class="flex justify-between items-center">
          <!-- 左侧信息 -->
          <div class="flex items-center gap-4">
            <div class="flex items-center">
              <i class="i-material-symbols-meeting-room text-2xl text-gray-600" />
              <span class="ml-2 text-lg font-medium">房间号: {{ roomId }}</span>
            </div>
            <div class="
              flex items-center gap-1 
              px-3 py-1 
              bg-gray-100 rounded-full 
              text-sm text-gray-600
            ">
              <i class="i-material-symbols-group text-lg" />
              <span>{{ userCount }}人在线</span>
            </div>
          </div>
          
          <!-- 右侧操作 -->
          <div class="flex items-center gap-3">
            <!-- 房主标识 -->
            <div 
              v-if="isOwner" 
              class="
                flex items-center gap-1
                px-3 py-1 rounded-full
                bg-green-500 text-white 
                shadow-sm
              "
            >
              <i class="i-material-symbols-crown text-lg" />
              <span class="text-sm">房主</span>
            </div>
            <div 
              v-else 
              class="
                flex items-center gap-1
                px-3 py-1 rounded-full
                bg-gray-100 text-gray-600
              "
            >
              <i class="i-material-symbols-visibility text-lg" />
              <span class="text-sm">观看模式</span>
            </div>
            
            <!-- 同步按钮 -->
            <button
              v-if="!isOwner"
              @click="syncWithOwner"
              class="
                flex items-center gap-2 
                px-4 py-2 rounded-full
                bg-blue-500 text-white
                shadow-sm
                transition duration-200
                hover:bg-blue-600
                active:scale-95
              "
            >
              <i class="
                i-material-symbols-sync text-lg
                transition duration-300
                transform
              " :class="{ 'animate-spin': isSyncing }" />
              同步进度
            </button>
            
            <!-- 复制链接按钮 -->
            <button 
              @click="copyRoomLink"
              class="
                flex items-center gap-2 
                px-4 py-2 rounded-full
                bg-purple-500 text-white
                shadow-sm
                transition duration-200
                hover:bg-purple-600
                active:scale-95
              "
            >
              <i class="i-material-symbols-content-copy text-lg" />
              复制房间链接
            </button>
          </div>
        </div>
      </div>

      <!-- 内容区域 -->
      <div class="grid grid-cols-[2fr_1fr] gap-4">
        <!-- 视频播放器 -->
        <div class="bg-white rounded-xl shadow-sm overflow-hidden">
          <video
            ref="videoRef"
            :src="room.videoUrl"
            @play="handlePlay"
            @pause="handlePause"
            controls
            :controlsList="isOwner ? undefined : 'noplaybackrate'"
            :disableRemotePlayback="!isOwner"
            class="w-full aspect-video"
          />
        </div>
        
        <!-- 聊天室 -->
        <div class="h-[calc(100vh-12rem)] min-h-400px">
          <ChatRoom
            :is-owner="isOwner"
            :room-id="roomId"
            :user-id="userId"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import { showDialog } from '../utils/dialog';
import ChatRoom from '../components/ChatRoom.vue';
import { useSocket } from '../composables/useSocket';

const userStorage = window[process.env.USER_IDENTITY];

const route = useRoute();
const roomId = route.params.roomId;
const videoRef = ref(null);
const room = ref({});
const userCount = ref(1);
const userId = computed(() => {
  let id = userStorage?.getItem(`user_${roomId}`);
  if (!id) {
    id = Math.random().toString(36).substring(2, 10);
    userStorage?.setItem(`user_${roomId}`, id);
  }
  return id;
});
const isOwner = computed(() => {
  return userStorage?.getItem(`room_${roomId}_owner`) === room.value.owner;
});
const socket = useSocket();
let isSync = false;
let lastSyncTime = 0;
const isSyncing = ref(false);

onMounted(async () => {
  try {
    const response = await axios.get(`/api/rooms/${roomId}`);
    room.value = response.data;
    
    socket.emit('join-room', {
      roomId,
      isOwner: isOwner.value,
      userId: userId.value
    });
    
    // 房主接收同步请求
    if (isOwner.value) {
      socket.on('sync-request', (targetId) => {
        socket.emit('sync-response', {
          targetId,
          currentTime: videoRef.value.currentTime,
          isPlaying: !videoRef.value.paused
        });
      });
    }
    
    socket.on('room-users-update', (data) => {
      userCount.value = data.count;
    });
    
    socket.on('video-state-update', async (data) => {
      isSync = true;
      try {
        if (videoRef.value) {
          if (Math.abs(videoRef.value.currentTime - data.currentTime) > 2) {
            videoRef.value.currentTime = data.currentTime;
          }
          
          if (data.isPlaying && videoRef.value.paused) {
            await videoRef.value.play();
          } else if (!data.isPlaying && !videoRef.value.paused) {
            videoRef.value.pause();
          }
        }
      } catch (err) {
        console.warn('同步视频状态失败:', err);
      } finally {
        isSync = false;
      }
    });
  } catch (error) {
    console.error('获取房间信息失败:', error);
  }
});

onUnmounted(() => {
  socket.disconnect();
});

const handlePlay = () => {
  if (!isOwner.value) return;
  if (!isSync) {
    videoRef.value.play().then(() => {
      socket.emit('video-state-change', {
        roomId,
        currentTime: videoRef.value.currentTime,
        isPlaying: true
      });
    }).catch(err => {
      console.warn('播放失败:', err);
    });
  }
};

const handlePause = () => {
  if (!isOwner.value) return;
  if (!isSync) {
    socket.emit('video-state-change', {
      roomId,
      currentTime: videoRef.value.currentTime,
      isPlaying: false
    });
  }
};

const syncWithOwner = async () => {
  try {
    const now = Date.now();
    if (now - lastSyncTime < 1000) {
      return;
    }
    lastSyncTime = now;
    
    isSyncing.value = true;
    socket.emit('request-sync', roomId);
    
    // 3秒后停止动画
    setTimeout(() => {
      isSyncing.value = false;
    }, 3000);
  } catch (err) {
    isSyncing.value = false;
    showDialog({
      title: '同步失败',
      message: '无法同步房主的播放进度',
      showCancel: false,
      confirmText: '确定'
    });
  }
};

const copyRoomLink = async () => {
  const link = window.location.href;
  try {
    await navigator.clipboard.writeText(link);
    showDialog({
      message: '房间链接已复制到剪贴板',
      showCancel: false,
      confirmText: '知道了'
    });
  } catch (err) {
    showDialog({
      title: '复制失败',
      message: '请手动复制链接',
      showCancel: false,
      confirmText: '确定'
    });
  }
};
</script>
