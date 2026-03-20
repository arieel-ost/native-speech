const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  console.log('Navigating to localhost:3002...');
  
  try {
    await page.goto('http://localhost:3002/en/practice/phoneme/phoneme-th-voiceless', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Wait for page to fully render
    await page.waitForTimeout(2000);
    
    // Take full page screenshot
    await page.screenshot({ 
      path: 'screenshots/page-full.png',
      fullPage: true 
    });
    
    // Take viewport screenshot
    await page.screenshot({ 
      path: 'screenshots/page-viewport.png' 
    });
    
    console.log('Screenshots saved to screenshots/');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nMake sure the dev server is running on localhost:3002');
    console.log('Run: npm run dev');
  }
  
  await browser.close();
})();
