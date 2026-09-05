(() => {
  const canvas = document.querySelector('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const TAU = Math.PI * 2;
  const light = norm({x:-.55, y:-.42, z:1});
  const half = norm({x:-.25, y:-.25, z:1});
  const width = innerWidth;
  const height = innerHeight;
  const ratio = Math.min(devicePixelRatio, 2);
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.scale(ratio, ratio);
  let seed = 53747;
  const rand = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  const paper = ctx.createRadialGradient(width*.50,height*.49,20,width*.50,height*.49,width*.8);
  paper.addColorStop(0,'#28303e'); paper.addColorStop(.5,'#151e2d'); paper.addColorStop(1,'#0a101a');
  ctx.fillStyle = paper; ctx.fillRect(0,0,width,height);
  for(let i=0;i<width*height*.18;i++) {
    ctx.fillStyle = rand()>.5 ? `rgba(200,196,184,${rand()*.045})` : `rgba(0,0,0,${rand()*.09})`;
    ctx.fillRect(rand()*width,rand()*height,.5+rand(),.5+rand());
  }
  const scale = Math.min(width/900,height/820);
  const origin = {x:width*.50,y:height*.58};
  const petals = Array.from({length:6},(_,i)=>({angle: -.85+i*TAU/6+ (rand()-.5)*.19,length:230+rand()*70,width:60+rand()*20,curl:rand()*22-11,phase:rand()*TAU,tilt:rand()*.15-.075,front:i%2, tone:i%3}));
  petals.sort((a,b)=>Math.sin(a.angle)-Math.sin(b.angle));
  for(const petal of petals) drawPetal(petal);
  drawHeart();

  function surface(p,t,v) {
    const taper = Math.pow(Math.max(0,Math.sin(Math.PI*t)),.72);
    const forward = p.length*(t-.10*Math.pow(t,7));
    const cross = p.width*taper*v*(1-.25*t);
    const bend = p.curl*Math.sin(Math.PI*t)+Math.sin(t*4+p.phase)*6*t;
    const z = 65*Math.sin(t*Math.PI*.88)-75*Math.pow(t,5)+p.width*.62*taper*v*v + 16*Math.sin(t*4+p.phase)*v*taper;
    return {x:Math.cos(p.angle)*forward-Math.sin(p.angle)*(cross+bend),y:Math.sin(p.angle)*forward+Math.cos(p.angle)*(cross+bend),z:z+forward*p.tilt};
  }
  function project(p) { return {x:origin.x+(p.x+p.z*.15)*scale,y:origin.y+(p.y*.80-p.z*.65)*scale}; }
  function normal(p,t,v) {
    const a=surface(p,Math.max(.0001,t-.001),v),b=surface(p,Math.min(.9999,t+.001),v),c=surface(p,t,v-.001),d=surface(p,t,v+.001);
    let n=norm(cross(sub(b,a),sub(d,c))); if(n.z<0)n={x:-n.x,y:-n.y,z:-n.z}; return n;
  }
  function drawPetal(p) {
    const N=90, M=38;
    // A ruled surface carries both the petal's curvature and the light across it.
    for(let i=0;i<N;i++)for(let j=0;j<M;j++) {
      const t=(i+.5)/N, v=(j+.5)/M*2-1;
      const n=normal(p,t,v);
      const diffuse=.22+Math.max(0,dot(n,light))*.50;
      const shine=Math.pow(Math.max(0,dot(n,half)),17);
      const foldShade=.15*Math.exp(-v*v*50)*(1-t);
      const tone=diffuse+shine*.31-foldShade;
      const inner=Math.exp(-t*3.4);
      const base=[139+inner*51, 141-inner*47, 159-inner*37];
      const r=base[0]*tone+shine*47, g=base[1]*tone+shine*46, b=base[2]*tone+shine*34;
      const a=project(surface(p,i/N,j/M*2-1)),bb=project(surface(p,(i+1)/N,j/M*2-1)),c=project(surface(p,(i+1)/N,(j+1)/M*2-1)),d=project(surface(p,i/N,(j+1)/M*2-1));
      ctx.fillStyle=`rgba(${r},${g},${b},.94)`;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(bb.x,bb.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.fill();
    }
    // Fine longitudinal filaments follow the complete curled surface.
    for(let strand=0;strand<156;strand++) {
      const v=strand/155*2-1;
      const n=normal(p,.56,v);
      const sheen=Math.pow(Math.max(0,dot(n,half)),6);
      const golden=(strand%7===0);
      ctx.strokeStyle=golden?`rgba(232,197,151,${.12+sheen*.26})`:`rgba(218,210,215,${.08+sheen*.20})`;
      ctx.lineWidth=golden?.45:.24;
      ctx.beginPath();
      for(let k=0;k<=100;k++) {
        const t=.01+k/100*.985;
        const wandering=v+(Math.sin(t*11+p.phase+strand*.02)*.009+Math.sin(t*37+strand)*.002)*Math.sin(Math.PI*t);
        const q=project(surface(p,t,wandering));
        if(k===0)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);
      }
      ctx.stroke();
    }
    // The fine edge is broken where the light leaves the surface.
    for(const side of [-1,1]) {
      ctx.lineWidth=.7;
      for(let k=0;k<80;k++) {
        const t=(k+.5)/80,n=normal(p,t,side);
        const glint=Math.pow(Math.max(0,dot(n,half)),6);
        const a=project(surface(p,k/80,side)),b=project(surface(p,(k+1)/80,side));
        ctx.strokeStyle=`rgba(245,214,169,${.13+glint*.66})`;
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      }
    }
    // Small pigment deposits stay at the throat and follow the vein direction.
    for(let i=0;i<180;i++){
      const t=.05+rand()*.45,v=(rand()-.5)*1.45;
      const q=project(surface(p,t,v));
      ctx.fillStyle=`rgba(55,30,42,${.11+rand()*.42})`;ctx.beginPath();ctx.ellipse(q.x,q.y,.3+rand()*.7,.5+rand()*1.3,p.angle,0,TAU);ctx.fill();
    }
  }
  function drawHeart(){
    const at=project({x:0,y:0,z:0});
    for(let i=0;i<7;i++) {
      const a=-2.6+i*.29, len=55+rand()*35;
      const end=project({x:Math.cos(a)*len,y:Math.sin(a)*len,z:46+rand()*20});
      ctx.strokeStyle='rgba(242,214,164,.7)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(at.x,at.y);ctx.quadraticCurveTo((at.x+end.x)*.5-12,(at.y+end.y)*.5-12,end.x,end.y);ctx.stroke();
      ctx.fillStyle='#bc8858';ctx.beginPath();ctx.ellipse(end.x,end.y,2.1*scale,5*scale,a+.5,0,TAU);ctx.fill();
      ctx.fillStyle='rgba(255,224,168,.8)';ctx.beginPath();ctx.ellipse(end.x-.5,end.y-1,1*scale,2.8*scale,a+.5,0,TAU);ctx.fill();
    }
  }
  function dot(a,b){return a.x*b.x+a.y*b.y+a.z*b.z;}
  function sub(a,b){return{x:a.x-b.x,y:a.y-b.y,z:a.z-b.z};}
  function cross(a,b){return{x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x};}
  function norm(p){const l=Math.hypot(p.x,p.y,p.z)||1;return{x:p.x/l,y:p.y/l,z:p.z/l};}
})();
