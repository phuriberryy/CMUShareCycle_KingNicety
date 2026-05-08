// PM2 ecosystem — production deployment
// Usage: pm2 start ecosystem.config.cjs
// Logs:  pm2 logs [app-name]
module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: './backend',
      script: 'src/composition/server.js',
      interpreter: 'node',
      interpreter_args: '--experimental-vm-modules',
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
      max_memory_restart: '512M',
      restart_delay: 3000,
      max_restarts: 10,
    },
    {
      name: 'frontend',
      // `serve` serves the production build (no HMR, no dev-server overhead).
      // Install once: npm install -g serve
      // Build first:  cd frontend && REACT_APP_API_URL=https://app2.turnpro.dev/api npm run build
      cwd: './frontend',
      script: 'serve',
      args: '-s build -l 3001',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
      max_memory_restart: '128M',
    },
  ],
}
