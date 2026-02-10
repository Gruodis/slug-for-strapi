import { defineConfig } from '@strapi/pack-up';

export default defineConfig({
  minify: true,
  sourcemap: true, // Default is true, good for debugging. User snippet had false, but I recommend true.
  externals: ['path', 'fs'],
  tsconfig: './tsconfig.json',
});
