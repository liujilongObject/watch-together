# 构建阶段
FROM alibaba-cloud-linux-3-registry.cn-hangzhou.cr.aliyuncs.com/alinux3/node:20.16

# 以 root 用户执行权限操作
USER root
WORKDIR /home/node/app
RUN chown -R node:node /home/node/app

# 复制所有源文件
COPY package*.json ./
COPY client ./client
COPY server ./server
COPY .env ./

# 确保 static 目录存在且为空
RUN rm -rf server/static && mkdir -p server/static

# 安装依赖并构建
RUN npm ci
RUN npm run build:client

# 切换到 node 用户
USER node

EXPOSE 7766
CMD ["node", "./server/index.js"]
