const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  /* a flaky test that passes on the second go is a broken test, so: no retries */
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open:'never' }]] : [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    { name:'mac',    use:{ ...devices['Desktop Safari'], viewport:{ width:1312, height:821 } } },
    { name:'iphone', use:{ ...devices['iPhone 14'] } },
  ],
  webServer: {
    command: 'npx --yes http-server .. -p 4321 -c-1 --silent',
    url: 'http://127.0.0.1:4321/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
