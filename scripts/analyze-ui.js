const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  // Ensure screenshots directory exists
  if (!fs.existsSync('screenshots')) {
    fs.mkdirSync('screenshots');
  }
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  console.log('Analyzing UI at localhost:3002...\n');
  
  try {
    await page.goto('http://localhost:3002/en/practice/phoneme/phoneme-th-voiceless', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    await page.waitForTimeout(2000);
    
    // Get page metrics
    const metrics = await page.evaluate(() => {
      return {
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        scrollHeight: document.documentElement.scrollHeight,
        elements: {
          topBar: document.querySelector('header')?.getBoundingClientRect(),
          sidebar: document.querySelector('aside')?.getBoundingClientRect(),
          practiceZone: document.querySelector('main')?.getBoundingClientRect(),
          controls: document.querySelector('[class*="controls"]')?.getBoundingClientRect(),
          spectrograms: document.querySelector('[class*="pair"], [class*="overlayGrid"]')?.getBoundingClientRect(),
          feedback: document.querySelector('[class*="feedbackZone"]')?.getBoundingClientRect(),
          bottomNav: document.querySelector('footer')?.getBoundingClientRect(),
        }
      };
    });
    
    console.log('=== Layout Metrics ===');
    console.log(`Viewport: ${metrics.viewportWidth}x${metrics.viewportHeight}`);
    console.log(`Scroll height: ${metrics.scrollHeight}px`);
    console.log('');
    
    console.log('=== Element Positions ===');
    for (const [name, rect] of Object.entries(metrics.elements)) {
      if (rect) {
        console.log(`${name}:`);
        console.log(`  Position: ${Math.round(rect.top)},${Math.round(rect.left)}`);
        console.log(`  Size: ${Math.round(rect.width)}x${Math.round(rect.height)}`);
        console.log(`  Visible: ${rect.top < metrics.viewportHeight && rect.bottom > 0 ? 'YES' : 'NO (needs scroll)'}`);
        console.log('');
      }
    }
    
    // Take screenshots of different areas
    console.log('Taking screenshots...\n');
    
    // 1. Full page
    await page.screenshot({ 
      path: 'screenshots/01-full-page.png',
      fullPage: true 
    });
    console.log('✓ 01-full-page.png');
    
    // 2. Initial viewport only
    await page.screenshot({ 
      path: 'screenshots/02-viewport.png' 
    });
    console.log('✓ 02-viewport.png');
    
    // 3. Top section (above fold)
    const topBar = await page.$('header');
    if (topBar) {
      await topBar.screenshot({ path: 'screenshots/03-top-bar.png' });
      console.log('✓ 03-top-bar.png');
    }
    
    // 4. Sidebar
    const sidebar = await page.$('aside');
    if (sidebar) {
      await sidebar.screenshot({ path: 'screenshots/04-sidebar.png' });
      console.log('✓ 04-sidebar.png');
    }
    
    // 5. Practice zone (main content)
    const main = await page.$('main');
    if (main) {
      await main.screenshot({ path: 'screenshots/05-practice-zone.png' });
      console.log('✓ 05-practice-zone.png');
    }
    
    // 6. Controls
    const controls = await page.$('[class*="controls"]');
    if (controls) {
      await controls.screenshot({ path: 'screenshots/06-controls.png' });
      console.log('✓ 06-controls.png');
    }
    
    // 7. Spectrograms
    const spectrograms = await page.$('[class*="pair"], [class*="overlayGrid"]');
    if (spectrograms) {
      await spectrograms.screenshot({ path: 'screenshots/07-spectrograms.png' });
      console.log('✓ 07-spectrograms.png');
    }
    
    // 8. Bottom nav
    const bottomNav = await page.$('footer');
    if (bottomNav) {
      await bottomNav.screenshot({ path: 'screenshots/08-bottom-nav.png' });
      console.log('✓ 08-bottom-nav.png');
    }
    
    console.log('\n=== Analysis Summary ===');
    const needsScroll = metrics.scrollHeight > metrics.viewportHeight;
    console.log(`Page requires scrolling: ${needsScroll ? 'YES' : 'NO'}`);
    if (needsScroll) {
      console.log(`Scroll amount: ${metrics.scrollHeight - metrics.viewportHeight}px`);
    }
    
    // Check if key elements are visible without scroll
    const keyElements = ['controls', 'spectrograms'];
    console.log('\nKey elements visibility:');
    for (const name of keyElements) {
      const rect = metrics.elements[name];
      if (rect) {
        const visible = rect.top < metrics.viewportHeight && rect.bottom > 0;
        console.log(`  ${name}: ${visible ? '✓ visible' : '✗ needs scroll'}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\n⚠ Make sure the dev server is running:');
    console.log('   bun dev');
    console.log('\nThen run this script again.');
  }
  
  await browser.close();
})();
