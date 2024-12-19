import os from 'os'

export function getIPV4() {
  const interfaces = os.networkInterfaces();
  for (const ips of Object.values(interfaces)) {
    for (const ip of ips) {
      if (ip.family === 'IPv4' && !ip.internal) {
        return ip.address;
      }
    }
  }
}
