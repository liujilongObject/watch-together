import { createApp, h } from 'vue';
import Dialog from '../components/Dialog.vue';

export function showDialog(options = {}) {
  return new Promise((resolve, reject) => {
    const container = document.createElement('div');
    
    const app = createApp({
      render() {
        return h(Dialog, {
          visible: true,
          ...options,
          'onUpdate:visible': (val) => {
            if (!val) {
              app.unmount();
              container.remove();
            }
          },
          onConfirm: () => {
            resolve();
            app.unmount();
            container.remove();
          },
          onCancel: () => {
            reject();
            app.unmount();
            container.remove();
          }
        });
      }
    });
    
    document.body.appendChild(container);
    app.mount(container);
  });
} 