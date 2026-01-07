import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // 사용자가 요청한 청크 사이즈 경고 한도 상향 조정
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // 라이브러리별로 청크를 나누어 로딩 성능 최적화
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-utils': ['@google/genai', 'recharts'],
        },
      },
    },
  },
});