module.exports = {
  apps: [
    {
      name: 'resomd-server',
      script: 'dist/src/main.js', // Path to the compiled NestJS server main file
      cwd: './apps/server',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
    },
    {
      name: 'resomd-web',
      script: 'node_modules/vite/bin/vite.js', // Launch Vite executable directly
      args: 'preview --host 0.0.0.0', // Preview built assets using Vite's preview settings
      cwd: './apps/web',
      instances: 1,
      autorestart: true,
      restart_delay: 2000,
    },
  ],
};
