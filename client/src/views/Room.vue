<template>
  <div class="max-w-800px mx-auto p-6 font-roboto">
    <!-- 顶部卡片 -->
    <div class="bg-white rounded-lg shadow-md p-4 mb-6">
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-3">
          <div class="flex items-center">
            <i class="i-material-symbols-meeting-room text-2xl text-gray-600"></i>
            <h2 class="ml-2 text-lg font-medium">房间号: {{ roomId }}</h2>
          </div>
          <div class="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-600">
            {{ userCount }}人在线
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <div 
            v-if="isOwner" 
            class="bg-green-500 text-white px-3 py-1 rounded-full text-sm shadow-sm"
          >
            房主
          </div>
          <div 
            v-else 
            class="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm"
          >
            观看模式
          </div>
          
          <button
            v-if="!isOwner"
            @click="syncWithOwner"
            class="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full shadow-sm transition-colors duration-200"
          >
            <i :class="[
              'i-material-symbols-sync text-lg transition-all duration-300',
              { 'animate-spin': isSyncing }
            ]"></i>
            同步进度
          </button>
          
          <button 
            @click="copyRoomLink"
            class="btn flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-full shadow-sm transition-colors duration-200"
          >
            <i class="i-material-symbols-content-copy text-lg"></i>
            复制房间链接
          </button>
        </div>
      </div>
    </div>

    <!-- 视频播放器卡片 -->
    <div class="bg-white rounded-lg shadow-md overflow-hidden">
      <video
        ref="videoRef"
        :src="room.videoUrl"
        @play="handlePlay"
        @pause="handlePause"
        controls
        :controlsList="isOwner ? undefined : 'noplaybackrate'"
        :disableRemotePlayback="!isOwner"
        class="w-full"
      ></video>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { io as SocketClient } from 'socket.io-client';
import axios from 'axios';
import { showDialog } from '../utils/dialog';

const route = useRoute();
const roomId = route.params.roomId;
const videoRef = ref(null);
const room = ref({});
const userCount = ref(1);
const isOwner = computed(() => {
  return localStorage.getItem(`room_${roomId}_owner`) === room.value.owner;
});
const socket = SocketClient('http://localhost:3000', {
  withCredentials: true
});
let isSync = false;
let lastSyncTime = 0;
const isSyncing = ref(false);

onMounted(async () => {
  try {
    const response = await axios.get(`/api/rooms/${roomId}`);
    room.value = response.data;
    
    socket.emit('join-room', {
      roomId,
      isOwner: isOwner.value // 设置房主标识
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