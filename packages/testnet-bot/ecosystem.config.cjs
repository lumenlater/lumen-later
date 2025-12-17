/**
 * PM2 Ecosystem Configuration
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 start ecosystem.config.cjs --only testnet-bot
 *   pm2 logs testnet-bot
 *   pm2 stop testnet-bot
 */

module.exports = {
  apps: [
    {
      name: 'testnet-bot',
      script: 'dist/bin/run.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      env_development: {
        NODE_ENV: 'development',
      },
      // Logs
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Restart behavior
      exp_backoff_restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s',
      // Cron restart (optional - restart daily at 3am)
      // cron_restart: '0 3 * * *',
    },
    {
      name: 'testnet-bot-bootstrap',
      script: 'dist/bin/bootstrap.js',
      cwd: __dirname,
      instances: 1,
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
