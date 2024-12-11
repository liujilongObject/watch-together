<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- 遮罩层 -->
        <div 
          class="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
          @click="handleClose"
        ></div>
        
        <!-- 对话框 -->
        <div 
          class="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 transform transition-all duration-300"
          :class="{ 'scale-100 opacity-100': visible, 'scale-95 opacity-0': !visible }"
        >
          <!-- 标题栏 -->
          <div 
            v-if="title" 
            class="px-6 py-4 border-b border-gray-100"
          >
            <h3 class="text-xl font-medium text-gray-900">{{ title }}</h3>
          </div>
          
          <!-- 内容区 -->
          <div class="px-6 py-5">
            <div class="text-base text-gray-600 leading-relaxed">
              {{ message }}
            </div>
          </div>
          
          <!-- 按钮区 -->
          <div class="px-6 py-4 flex justify-end gap-3">
            <button
              v-if="showCancel"
              @click="handleClose"
              class="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors duration-200"
            >
              {{ cancelText }}
            </button>
            <button
              @click="handleConfirm"
              class="px-5 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-full shadow-sm transition-colors duration-200"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    required: true
  },
  showCancel: {
    type: Boolean,
    default: true
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  confirmText: {
    type: String,
    default: '确定'
  }
});

const emit = defineEmits(['update:visible', 'confirm', 'cancel']);

const handleClose = () => {
  if (props.showCancel) {
    emit('update:visible', false);
    emit('cancel');
  }
};

const handleConfirm = () => {
  emit('update:visible', false);
  emit('confirm');
};

// ESC 关闭
const handleKeydown = (e) => {
  if (e.key === 'Escape' && props.visible && props.showCancel) {
    handleClose();
  }
};

// 监听键盘事件
watch(() => props.visible, (val) => {
  if (val) {
    document.addEventListener('keydown', handleKeydown);
  } else {
    document.removeEventListener('keydown', handleKeydown);
  }
});
</script>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.3s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .relative,
.dialog-leave-to .relative {
  transform: scale(0.95);
  opacity: 0;
}
</style> 