(()=>{'use strict';
const c=document.querySelector('#herbarium'),g=c.getContext('2d'),motion=matchMedia('(prefers-reduced-motion: reduce)');
let w,h,dpr,scale,ox,oy,last=0,t=0,raf=0,hold=false,touch=0;
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)},TAU=Math.PI*2;
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let b=Math.imul(a^a>>>15,1|a);b=b+Math.imul(b^b>>>7,61|b)^b;return((b^b>>>14)>>>0)/4294967296}}
function path(ctx,p){ctx.beginPath();ctx.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)ctx.lineTo(p[i][0],p[i][1]);}
function petal(seed,len,width,bend,tone){const r=rng(seed),canvas=document.createElement('canvas');canvas.width=640;canvas.height=780;const q=canvas.getContext('2d'),cx=320,base=700,S=1.5,phase=r()*TAU;
 function pt(v,u){const belly=Math.pow(Math.sin(Math.PI*v),.71)*(1+.12*Math.sin(v*11+phase));const edge=1+.037*Math.sin(v*39+phase)+.015*Math.sin(v*81+u*4);return[cx+S*(bend*v*v+u*width*belly*edge),base-S*(len*v+width*.12*u*u*Math.sin(v*Math.PI))]}
 const outline=[];for(let i=0;i<=100;i++)outline.push(pt(i/100,-1));for(let i=100;i>=0;i--)outline.push(pt(i/100,1));path(q,outline);q.closePath();q.save();q.clip();
 const grd=q.createLinearGradient(240,720,350,100);grd.addColorStop(0,`rgba(${tone},.08)`);grd.addColorStop(.35,`rgba(${tone},.38)`);grd.addColorStop(.74,`rgba(${tone},.6)`);grd.addColorStop(1,`rgba(${tone},.26)`);q.fillStyle=grd;q.fillRect(0,0,640,780);
 for(let j=0;j<155;j++){const u=-1+2*j/154,pts=[];for(let i=0;i<=80;i++){const v=i/80,p=pt(v,u*(.7+.3*v));p[0]+=Math.sin(v*19+u*5)*(.6+v)*2;pts.push(p)}path(q,pts);q.strokeStyle=`rgba(248,218,202,${.016+r()*.037})`;q.lineWidth=.3+r()*1.35;q.stroke();}
 for(let j=0;j<46;j++){const u=r()*2-1,pts=[];const start=r()*.45;for(let i=0;i<=60;i++){const v=start+(1-start)*i/60;pts.push(pt(v,u*(.4+.6*v)))}path(q,pts);q.strokeStyle=`rgba(55,18,40,${.012+r()*.04})`;q.lineWidth=.3+r()*1.2;q.stroke()}
 for(let i=0;i<7500;i++){const x=r()*640,y=r()*780;q.fillStyle=r()>.45?'rgba(250,225,207,.019)':'rgba(50,17,30,.025)';q.fillRect(x,y,.6+r()*1.1,.6+r()*1.1)}
 q.restore();path(q,outline);q.closePath();q.strokeStyle='rgba(246,211,194,.14)';q.lineWidth=.6;q.stroke();
 return canvas;}
 const specs=[
 [-2.68,225,67,-28,'191,133,149',2.0],[-1.89,240,85,22,'217,172,174',2.8],[-1.02,208,73,-24,'234,187,179',3.8],[-.21,201,87,16,'222,167,175',5.0],[.61,195,79,-15,'236,199,184',6.0],[1.45,192,85,24,'209,156,170',7.2],[2.36,204,75,-18,'237,201,189',8.4],[-.8,149,48,6,'246,218,199',9.3],[.28,145,56,-9,'243,211,193',10.2],[1.7,139,51,16,'227,180,179',11.4]
 ].map((p,i)=>({angle:p[0],img:petal(198+i*67,p[1],p[2],p[3],p[4]),birth:p[5]}));
 const reveal=document.createElement('canvas');reveal.width=640;reveal.height=780;const mask=reveal.getContext('2d');
 const bud=[[-.7,petal(701,118,43,21,'210,169,184'),9.2],[.25,petal(915,137,35,-13,'235,203,204'),10.4],[.85,petal(671,112,43,-12,'223,180,186'),11.8]];
 function resize(){w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,2);c.width=w*dpr;c.height=h*dpr;scale=Math.min(w/730,h/860);ox=w/2;oy=h*.47-35*scale;draw();}
 function stem(points,progress,col,width){g.beginPath();for(let i=0;i<=120*clamp(progress);i++){let z=i/120,a=1-z,x=a*a*a*points[0]+3*a*a*z*points[2]+3*a*z*z*points[4]+z*z*z*points[6],y=a*a*a*points[1]+3*a*a*z*points[3]+3*a*z*z*points[5]+z*z*z*points[7];i?g.lineTo(x,y):g.moveTo(x,y)}g.strokeStyle=col;g.lineWidth=width;g.stroke()}
 function showPetal(img,angle,birth,now,x,y,k=1){let p=ease((now-birth)/2.5);if(!p)return;let nervous=p-.055*Math.sin(p*TAU*2)*Math.sin(p*Math.PI);g.save();g.translate(x,y);g.rotate(angle);g.scale(k*(.87+.13*p),k);g.globalAlpha=ease((now-birth)/.7);mask.clearRect(0,0,640,780);mask.globalCompositeOperation='source-over';mask.drawImage(img,0,0);if(p<1){let edge=700-730*nervous;const fade=mask.createLinearGradient(0,edge-36,0,edge+30);fade.addColorStop(0,'rgba(0,0,0,0)');fade.addColorStop(.55,'rgba(0,0,0,.3)');fade.addColorStop(1,'rgba(0,0,0,1)');mask.globalCompositeOperation='destination-in';mask.fillStyle=fade;mask.fillRect(0,0,640,780);}g.drawImage(reveal,-320/1.5,-700/1.5,640/1.5,780/1.5);g.restore()}
 function draw(){g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle='#21171d';g.fillRect(0,0,w,h);let bg=g.createRadialGradient(w*.48,h*.43,0,w*.48,h*.43,Math.max(w,h)*.7);bg.addColorStop(0,'#34232c');bg.addColorStop(.8,'#20161c');bg.addColorStop(1,'#181216');g.fillStyle=bg;g.fillRect(0,0,w,h);g.save();g.translate(ox,oy);g.scale(scale,scale);let now=motion.matches?18:t;
 stem([70,365,51,243,-71,158,-90,-23],ease(now/4),'rgba(194,157,143,.31)',1.7);
 stem([71,366,153,244,228,120,172,22],ease((now-.6)/5),'rgba(196,156,155,.25)',1.4);
 stem([70,363,13,270,-160,214,-153,134],ease((now-2)/4),'rgba(159,138,133,.16)',1);
 // A thin folded leaf carries one slightly missed edge.
 if(now>4){g.save();g.globalAlpha=ease((now-4)/3)*.24;g.translate(-4,253);g.rotate(-1.15);g.scale(.52,.75);g.drawImage(specs[0].img,-213,-467,427,520);g.restore()}
 for(const p of specs)showPetal(p.img,p.angle,p.birth,now,-90,-23);
 for(const [a,img,b]of bud)showPetal(img,a,b,now,172,22,.92);
 let core=ease((now-11.1)/2.5);if(core){const r=rng(40);g.save();g.translate(-90,-23);g.globalAlpha=core;for(let i=0;i<67;i++){let a=r()*TAU,rad=Math.sqrt(r())*25,x=Math.cos(a)*rad,y=Math.sin(a)*rad*.75;g.beginPath();g.moveTo(x*.2,y*.2);g.quadraticCurveTo(x*1.1,y-10,x,y);g.strokeStyle='rgba(229,189,154,.35)';g.lineWidth=.65;g.stroke();g.fillStyle=`rgba(239,206,170,${.3+r()*.3})`;g.beginPath();g.ellipse(x,y,1.2+r()*1.5,.6+r(),a,0,TAU);g.fill()}g.restore()}
 g.restore();if(touch>.001){g.fillStyle=`rgba(159,85,92,${touch*.025})`;g.fillRect(0,0,w,h)}}
 function frame(ms){if(last&&!document.hidden){t+=Math.min(.05,(ms-last)/1000);touch+=(Number(hold)-touch)*.025}last=ms;draw();if(!motion.matches&&(t<18||hold||touch>.001))raf=requestAnimationFrame(frame);else raf=0}
 function run(){if(!raf){last=0;raf=requestAnimationFrame(frame)}}
 addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{last=0;if(!document.hidden)run()});motion.addEventListener('change',()=>{t=Math.max(t,18);draw();run()});c.addEventListener('pointerdown',()=>{hold=true;run()});addEventListener('pointerup',()=>hold=false);resize();run();
})();
