module.exports = {
  apps: [
    {
      name: 'resomd-api',
      script: 'pnpm',
      args: 'start',
      cwd: './apps/api',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      shell: true,
    },
    {
      name: 'resomd',
      script: 'pnpm',
      args: 'start',
      cwd: './apps/web',
      instances: 1,
      autorestart: true,
      restart_delay: 2000,
      shell: true,
    },
  ],
};
