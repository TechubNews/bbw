const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.binanceblockchainweek.com/event/f9827cbe-16f8-478a-bc06-f4e8b783ae54/speakers', {
      waitUntil: 'networkidle2',
      timeout: 180000,
    });
    await page.waitForSelector('[data-cvent-id="speakers-speakerCard"]', { timeout: 60000 });

    const debug = await page.evaluate(async () => {
      const button = document.querySelector('[data-cvent-id="speakers-speakerCard"] button');
      if (!button) {
        return { error: 'BUTTON_NOT_FOUND' };
      }
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const dialog = Array.from(document.querySelectorAll('[role="dialog"], [class*="Modal"]'))
        .map((node) => ({
          classes: node.className,
          text: node.innerText.slice(0, 200),
        }));
      const overlays = Array.from(document.querySelectorAll('[class*="Modal"], [class*="modal"]'))
        .map((node) => node.className);
      return { dialog, overlays, bodyChildren: document.body.children.length };
    });
    console.log(JSON.stringify(debug, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await browser.close();
  }
})();

