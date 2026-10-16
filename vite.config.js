import { defineConfig } from 'vite';
import { resolve } from 'path';

const page = (file) => resolve(__dirname, file);

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: page('index.html'),
        health: page('health-assessment.html'),
        goals: page('goals.html'),
        risk: page('risk-assessment.html'),
        investment: page('investment-planning.html'),
        retirement: page('retirement-planner.html'),
        calculators: page('calculators.html'),
        services: page('services.html'),
        about: page('about.html'),
        contact: page('contact.html'),
        insights: page('insights.html'),
        article: page('article.html'),
        login: page('login.html'),
        signup: page('signup.html'),
        myplan: page('my-plan.html'),
        privacy: page('privacy-policy.html'),
        terms: page('terms-of-use.html'),
        disclaimer: page('financial-disclaimer.html'),
        notFound: page('404.html'),
      },
    },
  },
  server: {
    port: 5175,
    host: 'localhost',
    proxy: {
      // All database access goes through the /api functions (see scripts/dev.js).
      '/api': {
        target: `http://localhost:${process.env.API_PORT || 3011}`,
        changeOrigin: true,
      },
    },
  },
});
