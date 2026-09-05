/* A thread keeps the small hesitation of the hand that pulled it. */
(() => {
  'use strict';
  const canvas = document.querySelector('#herbarium');
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let seed = 931, width, height, scale, ox, oy, last, elapsed = 0, raf;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a,b) => a + (b-a)*random();
  const paths = [];
  const point = (x,y) => ({x,y});
  const cubic = (a,b,c,d,t) => {const s=1-t;return point(s*s*s*a.x+3*s*s*t*b.x+3*s*t*t*c.x+t*t*t*d.x,s*s*s*a.y+3*s*s*t*b.y+3*s*t*t*c.y+t*t*t*d.y);};
  function thread(points,color,alpha,line,start,duration,interrupt=false) {
    paths.push({points,color,alpha,line,start,duration,interrupt,phase:range(0,7)});
  }
  function curve(a,b,c,d,color,alpha,line,start,duration,nervous=0.5) {
    const phase=range(0,6),points=[];
    for(let i=0;i<=70;i++){const t=i/70,p=cubic(a,b,c,d,t),v=Math.sin(t*Math.PI);p.x+=nervous*v*(Math.sin(t*23+phase)+.3*Math.sin(t*71));p.y+=nervous*v*Math.sin(t*17+phase);points.push(p);}
    thread(points,color,alpha,line,start,duration);
  }
  // The stems share a beginning but do not quite meet at the flowers.
  for(let i=0;i<8;i++) {
    const j=range(-1.8,1.8);
    curve(point(514+j,932),point(535+j,755),point(290+j,704),point(372+j,407),'186,131,114',range(.12,.3),range(.35,.75),i*.035,3.9,1.1);
    curve(point(514+j,932),point(432+j,776),point(657+j,747),point(623+j,566),'151,147,170',range(.1,.26),range(.3,.65),.65+i*.04,4.8,1.0);
  }
  function leaf(a,b,tip,color,start) {
    for(let i=0;i<23;i++){const q=i/22;curve(a,point(a.x+(tip.x-a.x)*.2+b.x*q,a.y+(tip.y-a.y)*.2+b.y*q),point(tip.x+b.x*(q-.5),tip.y+b.y*(q-.5)),tip,color,.11+random()*.13,.38,start+q*.7,1.9,.7);}
  }
  leaf(point(456,780),point(-74,-12),point(333,683),'148,147,129',3.2);
  leaf(point(567,741),point(53,17),point(710,669),'139,143,152',4.6);
  leaf(point(390,590),point(-25,-35),point(310,523),'168,131,122',4.0);
  function flower(cx,cy,size,rotation,color,start) {
    const transform=(x,y)=>point(cx+size*(x*Math.cos(rotation)-y*Math.sin(rotation)),cy+size*(x*Math.sin(rotation)+y*Math.cos(rotation)));
    const petals=[[-1.07,1.19,.48],[-.03,1.02,.69],[1.14,.77,.64],[2.22,.83,.52],[3.23,1.04,.60],[4.12,.89,.59]];
    petals.forEach(([angle,len,wide],pi)=>{
      const tipx=Math.cos(angle)*len,tipy=Math.sin(angle)*len;
      const nx=-Math.sin(angle),ny=Math.cos(angle);
      const petalStart=start+pi*.57;
      for(let k=0;k<69;k++) {
        const q=(k+.2)/69,spread=Math.sin(q*Math.PI),skew=(q-.5)*2;
        const actualLen=len*(.86+.14*Math.sin(q*Math.PI)+range(-.038,.038)),bend=wide*skew;
        const pts=[];const phase=range(0,6);
        for(let z=0;z<=62;z++) {
          const t=z/62;
          const outward=Math.sin(t*Math.PI)*bend*(.78+.28*Math.sin(t*3+pi))+Math.pow(t,4)*wide*.23*skew;
          const along=actualLen*Math.sin(t*Math.PI*.5);
          const buckle=Math.sin(t*Math.PI)*Math.sin(t*5+q*3)*.035;
          const x=Math.cos(angle)*along+nx*(outward+buckle)+Math.sin(t*24+phase)*.0015;
          const y=Math.sin(angle)*along+ny*(outward+buckle)+Math.cos(t*29+phase)*.0015;
          pts.push(transform(x,y));
        }
        const edge=Math.abs(skew)>.85;
        thread(pts,color,edge?range(.2,.43):range(.07,.19),range(.34,.69),petalStart+q*.8+range(0,.15),2.2+range(-.25,.7),k%17===0);
        // A few strands turn back. The correction remains separate.
        if(k===8||k===59){const displaced=pts.map((p,i)=>point(p.x+Math.sin(i/62*Math.PI)*range(1.3,2),p.y+.8));thread(displaced,color,.17,.4,petalStart+2.1,1.5,true);}
      }
      // A long loose loop records the turn at a petal tip.
      if(pi===0||pi===3){const p=transform(tipx,tipy);curve(p,point(p.x+nx*18,p.y+ny*18),point(p.x+nx*14+5,p.y+ny*13-8),point(p.x+nx*4,p.y+ny*4),color,.27,.45,petalStart+2.8,1.0,1);}
    });
    for(let i=0;i<24;i++){
      const angle=range(-2.8,.2),len=range(.17,.36);
      const a=transform(range(-.025,.025),range(-.025,.025)),d=transform(Math.cos(angle)*len,Math.sin(angle)*len);
      curve(a,point(a.x-10,a.y-17),point(d.x+8,d.y+6),d,'230,184,132',range(.17,.4),range(.4,.75),start+4+i*.035,1.3,.6);
    }
  }
  flower(372,407,173,-.28,'230,143,126',2.2);
  flower(623,566,139,2.47,'173,164,210',6.4);
  // A final thread trails beyond its intended edge.
  curve(point(636,681),point(666,766),point(570,803),point(598,851),'179,150,177',.24,.45,13.0,2.5,1.4);
  paths.sort((a,b)=>a.start-b.start);
  let paper;
  function resize(){width=innerWidth;height=innerHeight;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);scale=Math.min(width/660,height/1000)*.94;ox=(width-1000*scale)/2;oy=(height-1060*scale)/2;paper=document.createElement('canvas');paper.width=width;paper.height=height;const p=paper.getContext('2d');p.fillStyle='#150f15';p.fillRect(0,0,width,height);let g=p.createRadialGradient(width*.45,height*.44,0,width*.5,height*.5,Math.max(width,height)*.65);g.addColorStop(0,'rgba(80,42,43,.17)');g.addColorStop(1,'rgba(0,0,0,.1)');p.fillStyle=g;p.fillRect(0,0,width,height);const texture=p.getImageData(0,0,width,height);let s=773;for(let i=0;i<texture.data.length;i+=4){s=(s*1664525+1013904223)>>>0;const n=(s/4294967296-.5)*3;texture.data[i]+=n;texture.data[i+1]+=n;texture.data[i+2]+=n;}p.putImageData(texture,0,0);draw();}
  function draw(){ctx.drawImage(paper,0,0,width,height);ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.lineCap='round';ctx.lineJoin='round';const now=reduced.matches?20:elapsed;for(const p of paths){let t=Math.max(0,Math.min(1,(now-p.start)/p.duration));if(!t)continue;const hesitation=t-.037*Math.sin(t*Math.PI*4)*Math.sin(t*Math.PI);const count=Math.max(1,Math.min(p.points.length,Math.floor(hesitation*(p.points.length-1))+1));ctx.strokeStyle=`rgba(${p.color},${p.alpha*1.3})`;ctx.lineWidth=Math.max(p.line,.42/scale);ctx.beginPath();let pen=false;for(let i=0;i<count;i++){if(p.interrupt&&i>p.points.length*.68&&i<p.points.length*.75){pen=false;continue;}const a=p.points[i];if(!pen){ctx.moveTo(a.x,a.y);pen=true;}else ctx.lineTo(a.x,a.y);}ctx.stroke();}ctx.restore();}
  function frame(ts){if(last!=null&&!document.hidden)elapsed+=Math.min((ts-last)/1000,.05);last=ts;draw();if(elapsed<16&&!reduced.matches)raf=requestAnimationFrame(frame);else raf=null;}
  function run(){cancelAnimationFrame(raf);last=null;raf=requestAnimationFrame(frame);}
  addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{last=null;});reduced.addEventListener('change',()=>{draw();if(!reduced.matches)run();});resize();run();
})();
