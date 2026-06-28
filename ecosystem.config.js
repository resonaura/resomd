module.exports = {
  apps: [
    {
      name: 'resomd-api',
      script: 'dist/src/main.js', // Path to the compiled NestJS server main file
      cwd: './apps/api',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
    },
    {
      name: 'resomd',
      script: 'dist/src/main.js',
      cwd: './apps/web',
      instances: 1,
      autorestart: true,
      restart_delay: 2000,
    },
  ],
};
