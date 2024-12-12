<template>
  <div class="h-100vh bg-gray-100 flex items-center justify-center">
    <div class="max-w-600px w-full bg-white rounded-xl shadow-lg transform transition-all hover:shadow-xl p-8">
      <!-- Logo/Icon -->
      <div class="mb-8 text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500 text-white mb-4">
          <i class="text-3xl"></i>
        </div>
        <h1 class="text-2xl font-medium text-gray-800">一起看</h1>
        <p class="text-gray-600 mt-2">创建一个房间，与好友一起观看视频</p>
      </div>

      <!-- Input Card -->
      <div class="bg-gray-50 rounded-lg p-6">
        <div class="relative">
          <input
            v-model="videoUrl"
            placeholder="请输入视频URL"
            class="w-full px-4 py-3 rounded-lg bg-white border-2 border-gray-200 focus:border-blue-500 focus:ring-0 outline-none transition-colors duration-200 text-gray-700"
          />
          <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
            <i class="text-gray-400"></i>
          </div>
        </div>

        <button 
          class="mt-6 w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg transition-colors duration-200 font-medium shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          @click="createRoom"
        >
          创建房间
        </button>
      </div>

      <!-- Tips -->
      <div class="mt-6 text-center text-sm text-gray-500">
        <p>支持直接输入视频文件URL</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

console.log(process.env, '----------------');

const router = useRouter();
const videoUrl = ref('');

const createRoom = async () => {
  const response = await axios.post('/api/rooms', {
    videoUrl: videoUrl.value
  });
  console.log(process.env, '----------------');
  window[process.env.USER_IDENTITY]?.setItem(`room_${response.data.roomId}_owner`, response.data.owner);
  router.push(`/room/${response.data.roomId}`);
};
</script> 