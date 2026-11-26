import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' يجعل التطبيق يعمل على GitHub Pages داخل مسار فرعي (/اسم-المستودع/) وعلى أي استضافة أخرى.
export default defineConfig({
  base: './',
  plugins: [react()],
});
