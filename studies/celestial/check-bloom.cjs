const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert=require('node:assert/strict');
const url=new URL(process.argv[2] || 'http://127.0.0.1:4187/astral/');
url.searchParams.set('inspect','');
(async()=>{
  const browser=await chromium.launch();
  try {
    const page=await browser.newPage({viewport:{width:1200,height:1000}});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    // Control only the browser frame scheduler. The production scene has no test controls.
    await page.addInitScript(()=>{
      let now=1000,id=0;
      const queue=new Map();
      window.requestAnimationFrame=callback=>{queue.set(++id,callback);return id;};
      window.cancelAnimationFrame=id=>queue.delete(id);
      window.stepFrame=()=>{now+=250;const batch=[...queue.values()];queue.clear();batch.forEach(callback=>callback(now));};
    });
    await page.goto(url.href);
    await page.waitForFunction(()=>window.astralDiagnostics?.().ready);
    const read=()=>page.evaluate(()=>window.astralDiagnostics());
    const advance=async seconds=>{for(let i=0;i<seconds*4;i++)await page.evaluate(()=>window.stepFrame());};
    await page.evaluate(()=>window.stepFrame());
    const stages=[];
    for(const time of [0,2,4,7,11,15]){
      await advance(time-(stages.at(-1)?.bloomTime || 0));
      const state=await read();stages.push(state);
      assert.equal(state.bloomTime,time);
      assert.ok(state.blooms.every(b=>Math.abs(b.morph-(1-b.opening))<1e-7));
      if(process.env.SCENE_SCREENSHOTS)await page.screenshot({path:process.env.SCENE_SCREENSHOTS+'/bloom-'+time+'.png'});
    }
    assert.ok(stages[0].blooms.every(b=>b.growth===0&&b.morph===1));
    assert.ok(stages[1].blooms.some(b=>b.growth>0&&b.growth<1));
    assert.ok(stages[3].blooms[0].opening>.9&&stages[3].blooms[5].opening===0,'staggered opening');
    assert.ok(stages.at(-1).blooms.every(b=>b.growth===1&&b.morph===0));
    await page.getByRole('button',{name:'bloom bouquet again'}).click();
    assert.equal((await read()).bloomTime,0);
    await page.evaluate(()=>window.stepFrame());await advance(4);
    await page.getByRole('button',{name:'pause living motion'}).click();
    const paused=await read();await advance(2);
    assert.equal((await read()).bloomTime,paused.bloomTime);
    await page.getByRole('button',{name:'reset bouquet view'}).click();
    assert.equal((await read()).bloomTime,paused.bloomTime,'camera reset preserves bloom');
    await page.locator('summary').click();
    await page.waitForFunction(()=>window.astralDiagnostics().bloomTime===15);
    assert.ok((await read()).blooms.every(b=>b.morph===0),'picker displays complete bouquet');
    await page.getByRole('button',{name:'lagoon flowers',exact:true}).click();
    const colors=(await read()).materialColors;
    await page.getByRole('button',{name:'bloom bouquet again'}).click();
    assert.deepEqual((await read()).materialColors,colors,'replay retains colors');
    assert.equal((await read()).running,true,'explicit replay resumes motion');
    assert.equal((await read()).bloomTime,0);
    assert.equal(await page.locator('details').evaluate(e=>e.open),false);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({checks:'pass',stages:stages.map(s=>({time:s.bloomTime,opening:s.blooms.map(b=>+b.opening.toFixed(2)),triangles:s.triangles})),errors}));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
