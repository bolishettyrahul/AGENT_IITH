const HTTP_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const WS_URL = HTTP_URL.replace(/^http/, 'ws').replace(/^https/, 'wss');

export { HTTP_URL, WS_URL };
