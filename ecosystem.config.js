module.exports = {
  apps: [{
    name: 'promog-backend',
    script: 'dist/index.mjs',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      USE_DATABASE: 'true'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      USE_DATABASE: 'true'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};