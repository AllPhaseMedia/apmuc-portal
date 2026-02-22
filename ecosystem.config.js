module.exports = {
  apps: [
    {
      name: "apmuc-portal",
      script: ".next/standalone/server.js",
      node_args: "--env-file=.env",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
      },
    },
  ],
};
