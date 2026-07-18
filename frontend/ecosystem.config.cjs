module.exports = {
  apps: [
    {
      name: "storefront",
      cwd: `${__dirname}/.next/standalone`,
      script: "server.js",
      exec_mode: "cluster",
      instances: Number(process.env.WEB_CONCURRENCY || 1),
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      kill_timeout: 10000,
      listen_timeout: 10000,
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: "production",
        HOSTNAME: "127.0.0.1",
        PORT: 3000,
      },
    },
  ],
};
