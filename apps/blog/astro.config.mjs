import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/postcss';
import react from '@astrojs/react';

const isProd = process.env.BRANCH === 'main';
const isDev = process.env.BRANCH === 'dev';
const siteUrl = isProd ? 'https://sequences.minions.blog' : (isDev ? 'https://sequences.minions.blog' : 'http://localhost:4321');

export default defineConfig({
    site: siteUrl,
    integrations: [
        react(),
        mdx(),
        sitemap()
    ],
    vite: {
        css: {
            postcss: {
                plugins: [tailwindcss()],
            }
        }
    }
});
