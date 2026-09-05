(() => {
  'use strict';

  const canvas = document.querySelector('#garden');
  const ctx = canvas.getContext('2d', { alpha: false });
  const tideButton = document.querySelector('#tide');
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const palette = {
    ink: '#091228', navy: '#101d3d', blue: '#1b3160', silver: '#c9d2db',
    pearl: '#f5ead8', gold: '#e5b46c', violet: '#9e83bb', rose: '#d59aa7',
    iris: '#799cc7', leaf: '#526f6d', leafLight: '#91a69a'
  };
  let width = 0, height = 0, dpr = 1, artwork, flowers;
  let pointer = { x: -9999, y: -9999, down: false, strength: 0 };
  let last = performance.now(), elapsed = 0, tide = 0, quiet = reduceQuery.matches, revealStart = 0, frameId = 0;
  const random = mulberry32(168409);

  class Flower {
    constructor(options) {
      Object.assign(this, options);
      this.petals = [];
      const count = options.count || 7;
      for (let i = 0; i < count; i += 1) {
        const span = options.state === 'bud' ? .72 : options.state === 'side' ? 2.18 : options.state === 'partial' ? 3.55 : Math.PI * 2;
        const offset = options.state === 'open' || !options.state
          ? Math.PI * 2 * i / count
          : -span / 2 + (span * i / Math.max(1, count - 1));
        const angle = options.rotation + offset + randomRange(-.13, .13);
        this.petals.push({
          angle, length: randomRange(.83, 1.18), width: randomRange(.78, 1.16),
          fold: randomRange(-.22, .22), phase: randomRange(0, Math.PI * 2),
          tone: i % 3, edge: randomRange(.4, 1)
        });
      }
      this.seed = random() * 100;
    }

    position(time) {
      const b = pointerBend(this.x, this.y);
      const sway = quiet ? 0 : Math.sin(time * this.speed + this.phase) * this.sway;
      const tideSway = Math.sin(tide * 8 - this.order * .63) * Math.max(0, tide) * 22;
      return { x: this.x + b.x * this.follow + sway + tideSway, y: this.y + b.y * this.follow * .25 };
    }

    drawStem(time) {
      const pos = this.position(time);
      const reveal = this.reveal(time);
      if (reveal <= 0) return;
      const root = { x: this.rootX, y: height + 30 };
      const bend = pointerBend(pos.x, pos.y);
      ctx.save();
      ctx.lineCap = 'round';
      for (let line = 0; line < 3; line += 1) {
        const c1x = this.rootX + this.stemLean * .35 + bend.x * .18;
        const c1y = height * .72;
        const c2x = pos.x - this.stemLean * .32 + bend.x * .45;
        const c2y = pos.y + 95;
        strokeCubicPartial({x: root.x + (line - 1) * .8, y: root.y}, {x:c1x,y:c1y}, {x:c2x,y:c2y}, {x:pos.x,y:pos.y + this.scale * .24}, reveal);
        ctx.strokeStyle = line === 1 ? 'rgba(113, 151, 136, .67)' : 'rgba(31, 61, 65, .45)';
        ctx.lineWidth = line === 1 ? 1.25 : .52;
        ctx.stroke();
      }
      ctx.restore();
      if (reveal > .32) this.drawLeaves(pos, time, (reveal - .32) / .68);
    }

    drawLeaves(pos, time, reveal) {
      const points = [
        cubicPoint({x:this.rootX, y:height + 30}, {x:this.rootX + this.stemLean*.35, y:height*.72}, {x:pos.x-this.stemLean*.32, y:pos.y+95}, {x:pos.x,y:pos.y+this.scale*.24}, .34),
        cubicPoint({x:this.rootX, y:height + 30}, {x:this.rootX + this.stemLean*.35, y:height*.72}, {x:pos.x-this.stemLean*.32, y:pos.y+95}, {x:pos.x,y:pos.y+this.scale*.24}, .55)
      ];
      points.forEach((point, index) => {
        const side = (index === 0 ? -1 : 1) * this.leafSide;
        const angle = Math.atan2(pos.y - point.y, pos.x - point.x) + side * randomSign(this.seed + index) * 1.03;
        drawLeaf(point.x, point.y, angle, this.scale * (.37 + index * .07) * Math.min(1, reveal * 1.8), side, time, this.phase + index);
      });
    }

    draw(time) {
      const pos = this.position(time);
      const reveal = this.reveal(time);
      if (reveal <= 0) return;
      const opening = .76 + .24 * Math.sin(Math.min(1, tide * 1.8) * Math.PI * .5);
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(this.tilt + Math.sin(time * this.speed * .6 + this.phase) * .025);
      // Petal geometry is drawn on a 72-unit specimen sheet. Scale it once to pixels.
      ctx.scale((this.scale / 72) * opening, (this.scale / 72) * opening);
      this.petals.forEach((petal, i) => {
        const petalReveal = clamp((reveal * 1.5 - i * .075), 0, 1);
        drawPetal(petal, i, this, time, petalReveal);
      });
      if (reveal > .72 && this.state !== 'bud') drawFlowerHeart(this, time, (reveal - .72) / .28);
      ctx.restore();
    }

    reveal(time) {
      if (quiet) return 1;
      return clamp((time - revealStart - this.delay) / this.duration, 0, 1);
    }
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingQuality = 'high';
    artwork = createTexture();
    buildScene();
  }

  function buildScene() {
    const compact = width < 670;
    const s = Math.min(width / 1180, height / 880);
    const center = compact ? width * .50 : width * .56;
    const base = height * (compact ? .69 : .66);
    const make = (x, y, scale, tint, order, rest = {}) => new Flower({
      x: center + x * s, y: base + y * s, scale: scale * s,
      rootX: center + (x * .30 + rest.rootOffset) * s, stemLean: rest.stemLean * s,
      tint, order, rotation: rest.rotation || 0, tilt: rest.tilt || 0, count: rest.count,
      speed: .23 + order * .014, phase: rest.phase || order * 1.69, sway: (3 + order * .26) * s,
      follow: .13 + order * .012, leafSide: order % 2 ? 1 : -1,
      delay: rest.delay ?? order * .45, duration: rest.duration ?? 3.5,
      state: rest.state || 'open'
    });
    flowers = [
      // The flower heads overlap at a shared gathering point. The warm center appears last.
      make(-124, -146, 72, 'violet', 0, {rootOffset:-35, stemLean:-75, rotation:.65, tilt:-.47, count:6, delay:.2, state:'open'}),
      make(112, -142, 70, 'iris', 1, {rootOffset:45, stemLean:72, rotation:-.1, tilt:.48, count:6, delay:.7, state:'open'}),
      make(114, -44, 60, 'rose', 2, {rootOffset:34, stemLean:62, rotation:-.58, tilt:.36, count:5, delay:1.25, state:'side'}),
      make(-42, -97, 63, 'rose', 2.3, {rootOffset:-10, stemLean:-27, rotation:.38, tilt:-.18, count:6, delay:1.45, state:'open'}),
      make(57, -98, 57, 'pearl', 2.6, {rootOffset:15, stemLean:25, rotation:-.48, tilt:.16, count:5, delay:1.62, state:'partial'}),
      make(-164, -25, 55, 'pearl', 3, {rootOffset:-58, stemLean:-96, rotation:.86, tilt:-.45, count:5, delay:1.75, state:'side'}),
      make(-75, 19, 48, 'iris', 3.2, {rootOffset:-24, stemLean:-39, rotation:.18, tilt:-.28, count:5, delay:1.92, state:'partial'}),
      make(82, 27, 48, 'violet', 3.5, {rootOffset:24, stemLean:38, rotation:-.4, tilt:.27, count:5, delay:2.06, state:'side'}),
      make(8, -234, 49, 'pearl', 4, {rootOffset:-3, stemLean:12, rotation:.12, tilt:.04, count:4, delay:2.3, state:'bud'}),
      make(-236, 35, 39, 'violet', 5, {rootOffset:-92, stemLean:-136, rotation:.42, tilt:-.68, count:4, delay:2.8, state:'partial'}),
      make(20, -65, 136, 'coral', 6, {rootOffset:2, stemLean:-3, rotation:-.62, tilt:.04, count:7, delay:3.25, duration:4.5, state:'open'}),
      make(245, 8, 35, 'iris', 7, {rootOffset:89, stemLean:112, rotation:-.22, tilt:.57, count:3, delay:3.65, state:'bud'}),
      make(-34, 63, 43, 'pearl', 8, {rootOffset:-9, stemLean:-24, rotation:-.8, tilt:.13, count:4, delay:3.9, state:'partial'})
    ];
    revealStart = elapsed;
  }

  function createTexture() {
    const buffer = document.createElement('canvas');
    buffer.width = Math.max(1, Math.round(width * dpr));
    buffer.height = Math.max(1, Math.round(height * dpr));
    const c = buffer.getContext('2d');
    c.scale(dpr, dpr);
    c.fillStyle = '#10182e'; c.fillRect(0, 0, width, height);
    // Cotton rag: fixed fibers and restrained blue sediment, never a moving space field.
    c.strokeStyle='rgba(184,194,207,.018)';c.lineWidth=.4;
    for (let i=0;i<110;i+=1) { const y=random()*height;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(width*.3,y+randomRange(-8,8),width*.7,y+randomRange(-8,8),width,y+randomRange(-5,5));c.stroke(); }
    for (let i = 0; i < Math.floor(width * height / 55); i += 1) {
      const alpha = randomRange(.012, .045);
      c.fillStyle = random() > .5 ? `rgba(244,232,207,${alpha})` : `rgba(8,14,31,${alpha * 1.7})`;
      c.fillRect(random()*width, random()*height, randomRange(.25, 1.1), randomRange(.25, 1.1));
    }
    return buffer;
  }

  function draw(time) {
    ctx.drawImage(artwork, 0, 0, width, height);
    drawPaperLight();
    flowers.slice().sort((a,b) => a.order - b.order).forEach(flower => flower.drawStem(time));
    flowers.slice().sort((a,b) => a.order - b.order).forEach(flower => flower.draw(time));
    drawVignette();
  }

  function drawPaperLight() {
    const x = width * (width < 670 ? .50 : .57);
    const y = height * (width < 670 ? .64 : .60);
    const radius = Math.min(width, height) * .17;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const stain = ctx.createRadialGradient(x,y,4,x,y,radius);
    stain.addColorStop(0,'rgba(218,166,94,.10)'); stain.addColorStop(.58,'rgba(185,127,115,.035)'); stain.addColorStop(1,'rgba(23,31,62,0)');
    ctx.fillStyle=stain; ctx.beginPath();ctx.ellipse(x,y,radius,radius*.73,-.35,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

  function drawPetal(petal, index, flower, time, reveal) {
    const breathing = quiet ? 0 : Math.sin(time * .66 + petal.phase + flower.order) * .035;
    const open = 1 + breathing + Math.sin(tide * 8 - index * .65) * Math.max(0, tide) * .075;
    const angle = petal.angle + breathing * 1.4;
    const bud = flower.state === 'bud';
    const side = flower.state === 'side';
    const len = (bud ? 91 : 72) * petal.length * open;
    const wide = (bud ? 13 : side ? 21 : flower.state === 'partial' ? 24 : 30) * petal.width;
    ctx.save();ctx.rotate(angle);ctx.globalAlpha = reveal;
    const gradient = ctx.createLinearGradient(0, 0, len, 0);
    const colors = petalColors(flower.tint, petal.tone);
    gradient.addColorStop(0, colors.inner);gradient.addColorStop(.34,colors.mid);gradient.addColorStop(1,colors.tip);
    ctx.fillStyle=gradient;
    ctx.beginPath();ctx.moveTo(-4, 0);
    if (bud) {
      ctx.bezierCurveTo(len*.22, -wide*.38, len*.72, -wide*.7, len, -wide*.05);
      ctx.bezierCurveTo(len*.75, wide*.55, len*.26, wide*.38, -4, 0);
    } else if (side) {
      ctx.bezierCurveTo(len*.24, -wide*(.2+petal.fold), len*.59, -wide*1.33, len, -wide*.58);
      ctx.bezierCurveTo(len*.85, wide*.5, len*.43, wide*(.77-petal.fold), -4, 0);
    } else {
      ctx.bezierCurveTo(len*.18, -wide*(.38+petal.fold), len*.52, -wide*1.22, len, -wide*.16);
      ctx.bezierCurveTo(len*.83, wide*.92, len*.42, wide*(.94-petal.fold), -4, 0);
    }
    ctx.fill();
    // Three uneven pools keep pigment tied to a petal edge instead of using a screen-wide glow.
    ctx.save();ctx.clip();ctx.globalCompositeOperation='multiply';
    for (let pool = 0; pool < 3; pool += 1) {
      const px = len * (.18 + pool * .24 + Math.sin(petal.phase + pool) * .035);
      const py = Math.sin(petal.phase * 2 + pool * 2.7) * wide * .34;
      const wash = ctx.createRadialGradient(px, py, 1, px, py, wide * (1.08 - pool * .12));
      wash.addColorStop(0, pool === 0 ? 'rgba(110,59,102,.22)' : 'rgba(89,71,129,.12)');
      wash.addColorStop(.58, 'rgba(179,103,137,.045)');wash.addColorStop(1, 'rgba(60,45,96,0)');
      ctx.fillStyle=wash;ctx.beginPath();ctx.arc(px,py,wide*(1.08-pool*.12),0,Math.PI*2);ctx.fill();
    }
    ctx.globalCompositeOperation='source-over';ctx.restore();
    // A fine pale edge makes each petal resolve like silk against the dark.
    ctx.strokeStyle=colors.edge;ctx.lineWidth=.72;ctx.globalAlpha=petal.edge;
    ctx.beginPath();ctx.moveTo(-4,0);
    if (bud) {ctx.bezierCurveTo(len*.22,-wide*.38,len*.72,-wide*.7,len,-wide*.05);ctx.bezierCurveTo(len*.75,wide*.55,len*.26,wide*.38,-4,0);}
    else if (side) {ctx.bezierCurveTo(len*.24,-wide*(.2+petal.fold),len*.59,-wide*1.33,len,-wide*.58);ctx.bezierCurveTo(len*.85,wide*.5,len*.43,wide*(.77-petal.fold),-4,0);}
    else {ctx.bezierCurveTo(len*.18,-wide*(.38+petal.fold),len*.52,-wide*1.22,len,-wide*.16);ctx.bezierCurveTo(len*.83,wide*.92,len*.42,wide*(.94-petal.fold),-4,0);}ctx.stroke();
    ctx.globalAlpha=.38;
    ctx.strokeStyle=colors.vein;ctx.lineWidth=.5;
    ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(len*.48,wide*petal.fold*.12,len*.91,-wide*.08);ctx.stroke();
    for (let v = .23; v < .88; v += .16) {
      const x=len*v, sway=Math.sin(v*6+petal.phase)*wide*.13;
      ctx.globalAlpha=.17*(1-v*.34);ctx.beginPath();ctx.moveTo(x,sway);ctx.quadraticCurveTo(x+len*.10, -wide*(.18+v*.34), x+len*.17, -wide*(.26+v*.22));ctx.stroke();
      ctx.beginPath();ctx.moveTo(x,sway);ctx.quadraticCurveTo(x+len*.09, wide*(.2+v*.23), x+len*.15, wide*(.24+v*.15));ctx.stroke();
    }
    ctx.restore();
  }

  function drawFlowerHeart(flower, time, reveal) {
    ctx.save();
    ctx.globalCompositeOperation='screen';ctx.globalAlpha=reveal;
    const heart=ctx.createRadialGradient(-3,-4,1,0,0,26);
    heart.addColorStop(0,'rgba(255,247,210,.98)');heart.addColorStop(.23,'rgba(236,186,105,.9)');heart.addColorStop(1,'rgba(167,105,106,0)');
    ctx.fillStyle=heart;ctx.beginPath();ctx.arc(0,0,27,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='source-over';
    for (let i=0;i<18;i+=1) {
      const a=i*2.399 + flower.seed*.04;const d=7+(i%5)*2.3;
      ctx.fillStyle=i%3===0?'rgba(72,53,72,.9)':'rgba(247,205,120,.84)';ctx.beginPath();ctx.arc(Math.cos(a)*d,Math.sin(a)*d, i%4===0?1.55:.85,0,Math.PI*2);ctx.fill();
    }
    ctx.strokeStyle='rgba(247,222,166,.72)';ctx.lineWidth=.58;ctx.lineCap='round';
    for(let i=0;i<5;i+=1){const a=-1.72+i*.78+Math.sin(time*.7+i)*.03;ctx.beginPath();ctx.moveTo(0,1);ctx.quadraticCurveTo(Math.cos(a)*11,Math.sin(a)*11,Math.cos(a)*21,Math.sin(a)*21);ctx.stroke();ctx.fillStyle='rgba(241,191,102,.94)';ctx.beginPath();ctx.ellipse(Math.cos(a)*21,Math.sin(a)*21,1.45,2.6,a,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }

  function drawLeaf(x, y, angle, size, side, time, phase) {
    const quiver = quiet ? 0 : Math.sin(time*.55 + phase)*.04;
    ctx.save();ctx.translate(x,y);ctx.rotate(angle+quiver);
    const g=ctx.createLinearGradient(0,0,size,0);g.addColorStop(0,'rgba(105,146,130,.67)');g.addColorStop(.65,'rgba(73,113,104,.45)');g.addColorStop(1,'rgba(109,142,126,.08)');ctx.fillStyle=g;
    ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(size*.32,-size*.23*side,size*.78,-size*.2*side,size,0);ctx.bezierCurveTo(size*.72,size*.18*side,size*.29,size*.24*side,0,0);ctx.fill();
    ctx.strokeStyle='rgba(182,205,181,.35)';ctx.lineWidth=.52;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(size*.43,0,size*.94,0);ctx.stroke();ctx.restore();
  }

  function drawVignette() {
    const v=ctx.createRadialGradient(width*.52,height*.46,Math.min(width,height)*.21,width*.52,height*.46,Math.max(width,height)*.78);
    v.addColorStop(.65,'rgba(2,7,18,0)');v.addColorStop(1,'rgba(2,7,18,.46)');ctx.fillStyle=v;ctx.fillRect(0,0,width,height);
  }

  function petalColors(tint, tone) {
    const set={
      coral:[['rgba(252,214,195,.78)','rgba(217,116,111,.54)','rgba(124,63,93,.12)'],['rgba(255,229,202,.73)','rgba(232,145,125,.5)','rgba(158,73,93,.12)'],['rgba(244,192,189,.69)','rgba(197,95,117,.5)','rgba(113,53,83,.12)']],
      pearl:[['rgba(255,241,216,.72)','rgba(220,220,231,.50)','rgba(164,175,213,.12)'],['rgba(255,232,210,.61)','rgba(219,185,207,.42)','rgba(178,141,185,.10)'],['rgba(243,240,216,.66)','rgba(193,211,224,.46)','rgba(136,163,201,.11)']],
      rose:[['rgba(250,210,216,.66)','rgba(211,137,166,.42)','rgba(137,87,137,.09)'],['rgba(248,224,213,.70)','rgba(221,164,176,.46)','rgba(178,111,141,.1)'],['rgba(238,193,208,.64)','rgba(190,126,166,.44)','rgba(121,82,139,.09)']],
      violet:[['rgba(221,204,242,.62)','rgba(154,121,191,.44)','rgba(79,75,143,.11)'],['rgba(232,219,243,.65)','rgba(180,143,198,.40)','rgba(98,80,147,.09)'],['rgba(207,189,234,.61)','rgba(136,112,179,.45)','rgba(67,68,133,.1)']],
      iris:[['rgba(202,222,244,.62)','rgba(104,148,198,.44)','rgba(53,87,151,.1)'],['rgba(220,229,243,.67)','rgba(132,169,206,.42)','rgba(61,98,154,.1)'],['rgba(194,213,239,.62)','rgba(94,128,187,.46)','rgba(48,75,139,.1)']]
    }[tint][tone];
    return {inner:set[0],mid:set[1],tip:set[2],edge:'rgba(249,236,213,.42)',vein:tint==='iris'?'rgba(212,230,247,.9)':'rgba(244,221,204,.85)'};
  }

  function pointerBend(x, y) {
    if (!pointer.down && pointer.strength < .01) return {x:0,y:0};
    const dx=x-pointer.x,dy=y-pointer.y,d=Math.hypot(dx,dy);const reach=Math.min(width,height)*.42;
    if(d>reach)return{x:0,y:0};const force=(1-d/reach)*pointer.strength;
    return{x:(-dx/(d||1))*force*42,y:(-dy/(d||1))*force*18};
  }
  function strokeCubicPartial(a, b, c, d, amount) {
    const count = 48;
    const stop = Math.max(1, Math.floor(count * amount));
    ctx.beginPath();
    for (let i = 0; i <= stop; i += 1) {
      const point = cubicPoint(a, b, c, d, i / count);
      if (i === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
    }
    if (stop < count) {
      const point = cubicPoint(a, b, c, d, amount);
      ctx.lineTo(point.x, point.y);
    }
  }
  function bloom() { tide=1; revealStart=elapsed; }
  function frame(now) {
    const dt=Math.min(.05,(now-last)/1000);last=now;elapsed+=dt;tide=Math.max(0,tide-dt*.37);
    pointer.strength += ((pointer.down ? 1 : 0) - pointer.strength) * Math.min(1,dt*3.1);
    draw(quiet ? 12 : elapsed);
    frameId = (!quiet && !document.hidden) ? requestAnimationFrame(frame) : 0;
  }
  function startLoop() { if (!frameId && !quiet && !document.hidden) { last=performance.now();frameId=requestAnimationFrame(frame); } }
  function onMove(event) { pointer.x=event.clientX;pointer.y=event.clientY;pointer.strength=Math.max(pointer.strength,.42);if(quiet)draw(12); }
  canvas.addEventListener('pointermove',onMove);
  canvas.addEventListener('pointerdown',event=>{onMove(event);pointer.down=true;canvas.setPointerCapture?.(event.pointerId);bloom();});
  canvas.addEventListener('pointerup',()=>{pointer.down=false;});canvas.addEventListener('pointercancel',()=>{pointer.down=false;});canvas.addEventListener('pointerleave',()=>{pointer.down=false;});
  tideButton.addEventListener('click',bloom);
  window.addEventListener('keydown',event=>{if(event.code==='Space'||event.code==='Enter'){event.preventDefault();bloom();}});
  window.addEventListener('resize',resize,{passive:true});
  reduceQuery.addEventListener?.('change',event=>{quiet=event.matches;if(quiet){if(frameId)cancelAnimationFrame(frameId);frameId=0;draw(12);}else startLoop();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&frameId){cancelAnimationFrame(frameId);frameId=0;}else startLoop();});
  resize();if(quiet)draw(12);else startLoop();

  function cubicPoint(a,b,c,d,t){const u=1-t;return{x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y};}
  function mulberry32(seed){return()=>{let n=seed+=0x6D2B79F5;n=Math.imul(n^n>>>15,n|1);n^=n+Math.imul(n^n>>>7,n|61);return((n^n>>>14)>>>0)/4294967296;};}
  function randomRange(min,max){return min+(max-min)*random();}
  function randomSign(value){return Math.sin(value*24.713)>0?1:-1;}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
})();
