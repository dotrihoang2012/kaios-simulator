const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--disable-web-security'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  
  await page.goto('file:///D:/desktop/Tools/platform-tools/KaiOS/index.html');
  await new Promise(r => setTimeout(r, 2000));
  
  await page.evaluate(() => {
    window.addEventListener('storage', e => {
      console.log('STORAGE EVENT IN PARENT:', e.key);
    });
  });
  
  // Create an iframe and modify localStorage
  await page.evaluate(() => {
    const iframe = document.createElement('iframe');
    iframe.src = 'about:blank';
    document.body.appendChild(iframe);
    
    // We can't modify localStorage of about:blank if file://, but let's try
  });
  
  await browser.close();
})();
