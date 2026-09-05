const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const base = process.argv[2] || 'http://127.0.0.1:4187/astral/';
const inspect = new URL(base); inspect.searchParams.set('inspect','');

(async () => {
  const browser = await chromium.launch();
  const reports = [];
  try {
    for (const [name,width,height] of [['desktop',1440,1000],['phone',390,844],['small-phone',320,568]]) {
      const page = await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
      const errors=[],requests=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      page.on('request',r=>requests.push(r.url()));
      assert.equal((await page.goto(inspect.href)).status(),200);
      await page.waitForFunction(()=>window.astralDiagnostics?.().ready);
      await page.waitForFunction(()=>[...document.querySelectorAll('.flower-option img')].every(i=>i.complete&&i.naturalWidth===160));
      const read=()=>page.evaluate(()=>window.astralDiagnostics());
      let state=await read();
      assert.equal(state.running,true);
      // Palette previews settle the bouquet before the general interaction checks.
      await page.locator('summary').click();
      await page.waitForFunction(()=>window.astralDiagnostics().bloomTime===15);
      await page.keyboard.press('Escape');
      state=await read();
      await page.getByRole('button',{name:'pause living motion'}).click();
      assert.equal((await read()).running,false);
      assert.equal(state.blooms.length,8);
      assert.ok(state.petalDepth[1]-state.petalDepth[0]>.5,'sculpted petal depth');
      assert.ok(state.drawCalls<150&&state.triangles<180000,'render budget including post-processing');
      assert.ok(new Set(state.blooms.map(b=>b.position[2])).size>4,'blooms occupy different depths');
      const front=await page.locator('canvas').screenshot();
      await page.locator('canvas').focus();
      await page.keyboard.press('ArrowRight');
      assert.ok((await read()).yaw>state.yaw);
      assert.ok(!front.equals(await page.locator('canvas').screenshot()),'rotation changes rendered geometry');
      await page.keyboard.press('Home');
      assert.equal((await read()).yaw,-.1);
      await page.mouse.move(width*.5,height*.5);await page.mouse.down();
      await page.mouse.move(width*.5+65,height*.5+12,{steps:5});await page.mouse.up();
      assert.ok((await read()).yaw>.2,'pointer rotation');
      await page.getByRole('button',{name:'reset bouquet view'}).click();
      await page.locator('summary').focus();await page.keyboard.press('Enter');
      await page.waitForFunction(()=>document.querySelector('details').open);
      await page.getByRole('button',{name:'lagoon flowers',exact:true}).click();
      state=await read();
      assert.deepEqual(state.materialColors,['62e4c4','b49cff']);
      assert.ok(state.blooms.every(b=>b.color===(b.role==='a'?'62e4c4':'b49cff')),'main selection owns complete meshes');
      await page.locator('[data-role="b"]').click();
      await page.getByRole('button',{name:'amber flowers',exact:true}).click();
      state=await read();
      assert.ok(state.blooms.every(b=>b.color===(b.role==='a'?'62e4c4':'ffc278')),'companion selection is independent');
      const beforeTextures=state.textures;
      for(const hex of ['#255abc','#fc6688','#99cc88'])await page.locator('#colour-b').evaluate((input,hex)=>{input.value=hex;input.dispatchEvent(new Event('input',{bubbles:true}));},hex);
      state=await read();
      assert.equal(state.materialColors[1],'99cc88');
      assert.equal(state.cacheSize,16,'two role specimens per shade; custom shades do not expand cache');
      assert.equal(state.textures,beforeTextures,'temporary render targets are disposed');
      await page.locator('[data-preset="nebula"]').click();
      assert.deepEqual((await read()).materialColors,['ff7892','b49cff']);
      assert.equal(await page.locator('.flower-option[aria-pressed="true"]').count(),1);
      const visibleWords=await page.evaluate(()=>{
        const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),words=[];
        while(walker.nextNode()){
          const n=walker.currentNode,p=n.parentElement;
          if(!/[a-z]/i.test(n.textContent)||p.closest('.sr-only,script,style'))continue;
          const style=getComputedStyle(p);
          if(style.display==='none'||style.visibility==='hidden')continue;
          const range=document.createRange();range.selectNode(n);
          if([...range.getClientRects()].some(r=>r.width>2&&r.height>2))words.push(n.textContent.trim());
        }
        return words;
      });
      assert.deepEqual(visibleWords,[],'wordless visible interface');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      const panel=await page.locator('.flower-shop').boundingBox();
      assert.ok(panel.x>=0&&panel.x+panel.width<=width&&panel.y>=0&&panel.y+panel.height<=height);
      if(process.env.SCENE_SCREENSHOTS)await page.screenshot({path:process.env.SCENE_SCREENSHOTS+'/'+name+'-picker.png'});
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('summary').evaluate(e=>e===document.activeElement),true);
      await page.getByRole('button',{name:'resume living motion'}).click();
      const initialAge=(await read()).age;
      await page.waitForFunction(t=>window.astralDiagnostics().age>t,initialAge);
      await page.getByRole('button',{name:'pause living motion'}).click();
      const paused=(await read()).age;await page.waitForTimeout(150);assert.equal((await read()).age,paused);
      state=await read();
      const centre=state.blooms[0].screen;
      await page.mouse.click(centre[0]+12,centre[1]+12);
      assert.equal((await read()).pulse,1,'touch wakes a bloom');
      // Inspect a side view as well as the default view.
      await page.locator('canvas').focus();
      for(let i=0;i<7;i++)await page.keyboard.press('ArrowRight');
      if(process.env.SCENE_SCREENSHOTS)await page.screenshot({path:process.env.SCENE_SCREENSHOTS+'/'+name+'-side.png'});
      await page.keyboard.press('Home');
      if(process.env.SCENE_SCREENSHOTS)await page.screenshot({path:process.env.SCENE_SCREENSHOTS+'/'+name+'.png'});
      assert.deepEqual(errors,[]);
      assert.ok(!requests.some(r=>/material.*webp|petal-mask/.test(r)),'scene does not use a flat bouquet image');
      assert.ok(requests.every(r=>new URL(r).origin===inspect.origin),'all runtime assets are same-origin');
      reports.push({name,drawCalls:state.drawCalls,triangles:state.triangles,geometryDepth:state.petalDepth,checks:'pass',errors});
      await page.close();
    }
    const fallback=await browser.newPage();
    await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,options){return kind==='webgl2'?null:get.call(this,kind,options);};});
    await fallback.goto(base);
    await fallback.locator('#fallback').waitFor({state:'visible'});
    assert.equal(await fallback.locator('.palette').isVisible(),false);
    assert.equal(await fallback.locator('.scene-tools').isVisible(),false);
    reports.push({fallback:'pass'});
    console.log(JSON.stringify(reports,null,2));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
