const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const path=require('node:path');
const fs=require('node:fs');
const output=process.env.SCENE_SCREENSHOTS;
if(!output)throw new Error('Set SCENE_SCREENSHOTS to the visual review directory.');
fs.mkdirSync(output,{recursive:true});
const url=new URL(process.argv[2] || 'http://127.0.0.1:4187/astral/');
url.searchParams.set('inspect','');
(async()=>{
  const browser=await chromium.launch();
  try {
    const page=await browser.newPage({viewport:{width:1000,height:1100}});
    await page.goto(url.href);
    await page.waitForFunction(()=>window.astralDiagnostics?.().ready);
    await page.getByRole('button',{name:'pause living motion'}).click();
    for(const preset of ['nebula','aurora','solstice']){
      await page.locator('summary').click();
      await page.locator('[data-preset="'+preset+'"]').click();
      await page.keyboard.press('Escape');
      await page.locator('canvas').focus();
      await page.keyboard.press('Home');
      await page.locator('canvas').evaluate(e=>e.blur());
      await page.screenshot({path:path.join(output,'light-'+preset+'.png')});
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
