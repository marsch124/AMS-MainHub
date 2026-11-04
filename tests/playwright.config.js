const { defineConfig, devices } = require('@playwright/test');

/* HUB_PORT lets two clones be tested side by side without sharing a server */
const PORT = process.env.HUB_PORT || 4321;

module.exports = defineConfig({
  testDir: '.',
  /* a flaky test that passes on the second go is a broken test, so: no retries */
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open:'never' }]] : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    { name:'mac',    use:{ ...devices['Desktop Safari'], viewport:{ width:1312, height:821 } } },
    { name:'iphone', use:{ ...devices['iPhone 14'] } },
  ],
  webServer: {
    command: `npx --yes http-server .. -p ${PORT} -c-1 --silent`,
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
