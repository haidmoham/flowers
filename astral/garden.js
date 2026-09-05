import * as THREE from 'three';
import { EffectComposer, RenderPass, UnrealBloomPass, OutputPass } from './vendor/effects.js';
import { life, flowerMaterial, makeFlower, addStem, openFlower, recolor } from './botany.js';

const canvas = document.querySelector('#herbarium');
const picker = document.querySelector('.palette');
const inputs = ['a','b'].map(id => document.querySelector('#colour-' + id));
const shades = [
  { name:'starlight', hex:'#6383ff' }, { name:'orchid', hex:'#db72d9' },
  { name:'lagoon', hex:'#62e4c4' }, { name:'ice', hex:'#8cdbff' },
  { name:'rose', hex:'#ff7892' }, { name:'amber', hex:'#ffc278' },
  { name:'lilac', hex:'#b49cff' }, { name:'moon', hex:'#e7e7ff' },
];
const presets = { nebula:['#ff7892','#b49cff'], aurora:['#62e4c4','#6383ff'], solstice:['#ffc278','#ff7892'] };
const nameOf = hex => shades.find(shade => shade.hex === hex)?.name || 'your light';
let activeRole = 'a', preset = 'nebula';
let renderer, composer, scene, camera, root, stars, bloom, thumbnailScene, thumbnailCamera, thumbnailFlower, thumbnailCompanions;
let mainMaterial, companionMaterial, thumbnailMaterial, spores;
// Preserve the owner's full-playback preference for this private piece.
// The visible pause control remains available at all times.
let running = true;
let frame = 0, last = 0, age = 0, pulse = 0, ready = false;
let bloomTime = 0;
const BLOOM_DURATION = 15;
let yaw = -.1, pitch = .03, zoom = 1, dragging = null;
let stage = { x:0,y:0,width:innerWidth,height:innerHeight };
const blooms = [], petalMeshes = [], orbitalObjects = [], specimenCache = new Map();
const raycaster = new THREE.Raycaster();
const stats = { drawCalls:0, triangles:0, frameMs:0, frames:0 };

function fail(error) {
  if (error) console.error('Celestial renderer:', error);
  ready = false; cancelAnimationFrame(frame); frame = 0;
  document.querySelector('#fallback').hidden = false;
  document.querySelector('#loading').hidden = true;
  picker.hidden = true; document.querySelector('.scene-tools').hidden = true;
}

function lights(target) {
  target.add(new THREE.HemisphereLight('#e9c7e2','#100a20',.25));
  const key = new THREE.DirectionalLight('#ffe0d5',.5); key.position.set(-3,4,6); target.add(key);
  const fill = new THREE.DirectionalLight('#bb9deb',.25); fill.position.set(3,-1,2); target.add(fill);
  const rim = new THREE.DirectionalLight('#c5b4f7',.5); rim.position.set(-2,2,-3); target.add(rim);
}

let seed = 861;
function random() { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }
function starField() {
  const positions = [], colors = [], sizes = [];
  for (let i=0; i<1300; i++) {
    positions.push((random()-.5)*35,(random()-.5)*24,-3-random()*20);
    const tint = new THREE.Color().setHSL(.56+random()*.19,.2+random()*.35,.6+random()*.3);
    colors.push(tint.r,tint.g,tint.b); sizes.push(i%43===0?4.5:1+random()*1.5);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('size',new THREE.Float32BufferAttribute(sizes,1));
  const material = new THREE.ShaderMaterial({
    uniforms:{ time:life.time }, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    vertexShader:'attribute float size; attribute vec3 color; varying vec3 vColor; varying float vSeed; uniform float time; void main(){ vColor=color; vSeed=position.x*5.; vec4 p=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*p; gl_PointSize=size*(.82+.18*sin(time*.65+vSeed)); }',
    fragmentShader:'varying vec3 vColor; void main(){ vec2 p=gl_PointCoord-.5; float d=length(p); float core=exp(-d*d*35.); float cross=exp(-abs(p.x)*65.)*exp(-abs(p.y)*8.)+exp(-abs(p.y)*65.)*exp(-abs(p.x)*8.); float a=core+cross*.25; gl_FragColor=vec4(vColor*1.7,a*.75); }',
  });
  return new THREE.Points(geometry,material);
}

function nebula() {
  const material = new THREE.ShaderMaterial({ side:THREE.BackSide, depthWrite:false,
    uniforms:{ time:life.time },
    vertexShader:'varying vec3 vP; void main(){vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 vP; uniform float time;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){vec3 q=normalize(vP); vec3 p=q*4.+vec3(time*.003,0,0); float n=noise(p)*.55+noise(p*2.1)*.28+noise(p*4.3)*.12; float cloud=pow(n,3.)*exp(-pow((q.y+q.x*.32)*2.,2.)); vec3 col=vec3(.0018,.0022,.008); col+=vec3(.05,.015,.095)*cloud; col+=vec3(.008,.04,.05)*cloud*smoothstep(-.5,.5,q.x); gl_FragColor=vec4(col,1.); }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(38,24,16),material);
}

function pollenDrift() {
  const positions=[],sizes=[],colors=[];
  for(let i=0;i<90;i++){
    const a=random()*Math.PI*2,r=1.9+random()*1.0;
    positions.push(Math.cos(a)*r,(random()-.5)*4.5,Math.sin(a)*r);
    sizes.push(1.5+random()*2.5);
    colors.push(.4+random()*.6,.65+random()*.35,1);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('size',new THREE.Float32BufferAttribute(sizes,1));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const material=new THREE.ShaderMaterial({
    uniforms:{time:life.time,pulse:life.pulse},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:'attribute float size; attribute vec3 color; varying vec3 vColor; varying float vAlpha; uniform float time; uniform float pulse; void main(){vColor=color; vAlpha=.4+.3*sin(time*.8+position.x*3.); vec3 p=position; p.y+=sin(time*.35+position.z)*.12; vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=size*(1.+pulse*.6);}',
    fragmentShader:'varying vec3 vColor; varying float vAlpha; void main(){float d=length(gl_PointCoord-.5); gl_FragColor=vec4(vColor*2.5,exp(-d*d*28.)*vAlpha);}',
  });
  return new THREE.Points(geometry,material);
}

function orbit(radius, tilt, color, opacity) {
  const group = new THREE.Group(); group.rotation.set(tilt[0],tilt[1],tilt[2]);
  const points = Array.from({length:257},(_,i)=>new THREE.Vector3(Math.cos(i/256*Math.PI*2)*radius,Math.sin(i/256*Math.PI*2)*radius,0));
  const material = new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false});
  group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),material));
  const dot = new THREE.Mesh(new THREE.SphereGeometry(.018,8,6),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(3)}));
  group.add(dot); dot.position.x=radius;
  orbitalObjects.push({dot,radius,phase:random()*6,speed:.035+random()*.035});
  scene.add(group);
  return group;
}

function build() {
  renderer = new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.25:1.5));
  renderer.setSize(innerWidth,innerHeight);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.0;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38,innerWidth/innerHeight,.1,80);
  scene.add(nebula()); stars=starField(); scene.add(stars); lights(scene);
  root = new THREE.Group(); scene.add(root);
  spores=pollenDrift();root.add(spores);
  mainMaterial=flowerMaterial(inputs[0].value); companionMaterial=flowerMaterial(inputs[1].value);
  // Separate 3D objects carry palette ownership. No image-space mask is involved.
  const layout = [
    {role:'a',kind:'peony',p:[.05,.25,.55],s:1.05,rot:[-.12,.15,-.1]},
    {role:'b',kind:'cosmos',p:[-1.28,1.32,-.30],s:.67,rot:[-.25,-.48,.35]},
    {role:'a',kind:'peony',p:[.67,1.60,-.60],s:.66,rot:[-.38,.3,-.12]},
    {role:'b',kind:'cosmos',p:[1.47,.57,-.45],s:.53,rot:[.1,.55,.4]},
    {role:'a',kind:'peony',p:[-1.06,-.67,-.20],s:.57,rot:[.25,-.35,-.5]},
    {role:'b',kind:'cosmos',p:[1.03,-1.00,.0],s:.55,rot:[.3,.45,.2]},
    {role:'b',kind:'peony',p:[-.91,2.23,-.8],s:.19,rot:[-.5,-.2,0]},
    {role:'a',kind:'peony',p:[1.72,-.3,-.68],s:.22,rot:[0,.85,.3]},
  ];
  layout.forEach((item,i)=>{
    const flower=makeFlower(item.kind,item.role==='a'?mainMaterial:companionMaterial,i);
    flower.position.fromArray(item.p); flower.rotation.fromArray(item.rot); flower.scale.setScalar(item.s);
    flower.userData={role:item.role,baseY:item.p[1],scale:item.s,phase:i*.93,
      delay:3.2+[0,1.2,2.3,3.4,4.4,5.3,6.2,7.0][i]};
    flower.getObjectByName('petals').userData.role=item.role;
    petalMeshes.push(flower.getObjectByName('petals')); blooms.push(flower); root.add(flower);
    flower.userData.stem=addStem(root,new THREE.Vector3(...item.p).add(new THREE.Vector3(0,0,-.12)),i);
  });
  // A loose luminous spiral gathers the stems instead of florist wrapping.
  const ribbonPoints=Array.from({length:161},(_,i)=>{const t=i/160;return new THREE.Vector3(Math.cos(t*Math.PI*5)*(.15+t*.08),-2.30+t*.48,Math.sin(t*Math.PI*5)*(.15+t*.08)-.17);});
  root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ribbonPoints),new THREE.LineBasicMaterial({color:'#92c6fa',transparent:true,opacity:.6})));
  orbit(3.15,[1.04,.14,-.28],'#8d80d1',.24);
  orbit(2.88,[.46,-.8,.45],'#56969e',.18);
  orbit(3.24,[.20,.6,-.38],'#b49466',.19);
  composer=new EffectComposer(renderer);
  const pass=new RenderPass(scene,camera);
  composer.addPass(pass);
  bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.30,.72,.24);
  composer.addPass(bloom); composer.addPass(new OutputPass());
  thumbnailScene=new THREE.Scene(); lights(thumbnailScene);
  thumbnailCamera=new THREE.PerspectiveCamera(35,1.25,.1,10); thumbnailCamera.position.set(0,0,4.5);
  thumbnailMaterial=flowerMaterial('#6383ff');
  thumbnailFlower=makeFlower('peony',thumbnailMaterial); thumbnailFlower.rotation.set(-.15,.22,.12); thumbnailScene.add(thumbnailFlower);
  thumbnailCompanions=new THREE.Group();
  [[-.48,.32,.0],[.48,.3,-.1],[.0,-.46,.2]].forEach((p,i)=>{const f=makeFlower('cosmos',thumbnailMaterial);f.position.fromArray(p);f.scale.setScalar(.49);f.rotation.set(-.12,(i-1)*.22,i*.3);thumbnailCompanions.add(f);});
  thumbnailScene.add(thumbnailCompanions);
  ready=true; resize(); buildPicker(); updatePalette();
  document.body.classList.add('ready');
  syncMotionButton(); render(); run();
}

function specimen(hex,role=activeRole) {
  const key=role+hex;
  if(specimenCache.has(key)) return specimenCache.get(key);
  thumbnailFlower.visible=role==='a';thumbnailCompanions.visible=role==='b';
  recolor(thumbnailMaterial,hex);
  const width=160,height=128;
  const target=new THREE.WebGLRenderTarget(width,height,{type:THREE.UnsignedByteType});
  target.texture.colorSpace=THREE.SRGBColorSpace;
  const clear=renderer.getClearColor(new THREE.Color()), alpha=renderer.getClearAlpha();
  const oldTarget=renderer.getRenderTarget();
  renderer.setRenderTarget(target); renderer.setClearColor(0,0); renderer.clear();
  renderer.render(thumbnailScene,thumbnailCamera);
  const pixels=new Uint8Array(width*height*4); renderer.readRenderTargetPixels(target,0,0,width,height,pixels);
  const preview=document.createElement('canvas'); preview.width=width; preview.height=height;
  const ctx=preview.getContext('2d'), data=ctx.createImageData(width,height);
  for(let row=0;row<height;row++)data.data.set(pixels.subarray(row*width*4,(row+1)*width*4),(height-row-1)*width*4);
  ctx.putImageData(data,0,0); const url=preview.toDataURL();
  renderer.setRenderTarget(oldTarget); renderer.setClearColor(clear,alpha); target.dispose();
  if(shades.some(s=>s.hex===hex))specimenCache.set(key,url);
  return url;
}

function buildPicker() {
  for(const shade of shades){
    const button=document.createElement('button'); button.type='button'; button.className='flower-option'; button.dataset.flower=shade.hex;
    button.style.setProperty('--petal',shade.hex); button.setAttribute('aria-label',shade.name+' flowers');
    const image=document.createElement('img'); image.alt=''; image.width=62; image.height=49; image.src=specimen(shade.hex);
    button.append(image);
    button.addEventListener('click',()=>{preset='';inputs[activeRole==='a'?0:1].value=shade.hex;updatePalette();wake();});
    document.querySelector('#flower-options').append(button);
  }
}
function updatePalette(){
  inputs.forEach((input,i)=>{
    const role=i?'b':'a';
    document.documentElement.style.setProperty('--colour-'+role,input.value);
    document.querySelector('#name-'+role).textContent=nameOf(input.value);
    if(ready){recolor(i?companionMaterial:mainMaterial,input.value);document.querySelector('[data-role="'+role+'"] img').src=specimen(input.value,role);}
  });
  document.querySelectorAll('[data-flower]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.flower===inputs[activeRole==='a'?0:1].value)));
  document.querySelectorAll('[data-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.preset===preset)));
  document.querySelector('#palette-status').textContent=nameOf(inputs[0].value)+' at the heart, '+nameOf(inputs[1].value)+' in orbit.';
  render();
}
function selectRole(role){
  activeRole=role;
  document.querySelectorAll('[data-role]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.role===role)));
  document.querySelector('#selection-title').textContent=role==='a'?'pick your main blooms':'pick your companions';
  document.querySelector('#custom-a').hidden=role!=='a';document.querySelector('#custom-b').hidden=role!=='b';
  if(ready)document.querySelectorAll('[data-flower]').forEach(b=>b.querySelector('img').src=specimen(b.dataset.flower,role));
  updatePalette();
}
function closePicker(){picker.open=false;picker.querySelector('summary').focus();}
function wake(){pulse=1;render();run();}
function replayBloom(){
  picker.open=false;bloomTime=0;pulse=0;running=true;
  syncMotionButton();render();run();
}
function resetView(){yaw=-.1;pitch=.03;zoom=1;resize();wake();}
function syncMotionButton(){const b=document.querySelector('#motion');b.setAttribute('aria-pressed',String(running));b.setAttribute('aria-label',running?'pause living motion':'resume living motion');b.querySelector('span').textContent=running?'Ⅱ':'▷';b.querySelector('.tool-label').textContent=running?'pause':'resume';}
function toggleMotion(){running=!running;syncMotionButton();if(running)run();else{cancelAnimationFrame(frame);frame=0;last=0;render();}}

document.querySelectorAll('[data-role]').forEach(b=>b.addEventListener('click',()=>selectRole(b.dataset.role)));
document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{preset=b.dataset.preset;presets[preset].forEach((hex,i)=>inputs[i].value=hex);updatePalette();wake();}));
inputs.forEach(input=>input.addEventListener('input',()=>{preset='';updatePalette();wake();}));
document.querySelector('#close-picker').addEventListener('click',closePicker);
document.querySelector('#keep-bouquet').addEventListener('click',closePicker);
document.querySelector('#awaken').addEventListener('click',wake);
document.querySelector('#replay-bloom').addEventListener('click',replayBloom);
document.querySelector('#motion').addEventListener('click',toggleMotion);
document.querySelector('#reset-view').addEventListener('click',resetView);
picker.addEventListener('toggle',()=>{
  if(picker.open){picker.querySelector('.flower-shop').scrollTop=0;bloomTime=BLOOM_DURATION;}
  resize();
});
picker.addEventListener('keydown',e=>{if(e.key==='Escape')closePicker();});
document.addEventListener('pointerdown',e=>{if(!picker.contains(e.target))picker.open=false;});

canvas.addEventListener('pointerdown',e=>{dragging={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,id:e.pointerId};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{
  if(!dragging||e.pointerId!==dragging.id)return;
  yaw+=(e.clientX-dragging.x)*.007;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-dragging.y)*.006,-.8,.8);
  dragging.x=e.clientX;dragging.y=e.clientY;render();
});
canvas.addEventListener('pointerup',e=>{
  if(!dragging)return;
  if(Math.hypot(e.clientX-dragging.startX,e.clientY-dragging.startY)<6&&ready){
    raycaster.setFromCamera(new THREE.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2),camera);
    const hit=raycaster.intersectObjects(blooms,true)[0];
    if(hit){let object=hit.object;while(object&&!object.userData.role)object=object.parent;if(object)selectRole(object.userData.role);wake();}
  }
  dragging=null;
});
canvas.addEventListener('pointercancel',()=>dragging=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=THREE.MathUtils.clamp(zoom+e.deltaY*.0007,.82,1.3);resize();},{passive:false});
canvas.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','Enter',' '].includes(e.key))return;
  e.preventDefault();
  if(e.key==='Home')resetView();
  else if(e.key==='Enter')wake();
  else if(e.key===' ')toggleMotion();
  else{yaw+=e.key==='ArrowRight'?.16:e.key==='ArrowLeft'?-.16:0;pitch=THREE.MathUtils.clamp(pitch+(e.key==='ArrowDown'?.12:e.key==='ArrowUp'?-.12:0),-.8,.8);render();}
});
function resize(){
  if(!ready)return;
  renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);
  let x=0,y=70,width=innerWidth,height=innerHeight-215;
  if(innerWidth>700){y=65;height=innerHeight-160;}
  else if(!picker.open){y=75;height=innerHeight-y-150;}
  if(picker.open){const p=picker.querySelector('.flower-shop').getBoundingClientRect();if(innerWidth>700)width=p.left-16;else height=p.top-y-12;}
  stage={x,y,width:Math.max(200,width),height:Math.max(120,height)};
  const visibleHeight=Math.max(6.6,5.8/(stage.width/stage.height));
  camera.position.set(0,-.15,visibleHeight/(2*Math.tan(THREE.MathUtils.degToRad(19)))*zoom);
  camera.lookAt(0,-.15,0);
  camera.setViewOffset(stage.width,stage.height,-stage.x,-stage.y,innerWidth,innerHeight);
  camera.updateProjectionMatrix();
  root.position.x=0;
  render();
}
function render(){
  if(!ready)return;
  const start=performance.now();
  life.time.value=age; life.pulse.value=pulse;
  root.rotation.set(pitch, yaw+Math.sin(age*.14)*.045,Math.sin(age*.19)*.012);
  blooms.forEach((f,i)=>{
    const data=f.userData,stem=data.stem;
    const growth=THREE.MathUtils.smoothstep(bloomTime,.25+i*.15,3.05+i*.15);
    const opening=THREE.MathUtils.smoothstep(bloomTime,data.delay,data.delay+4.2);
    stem.mesh.geometry.setDrawRange(0,Math.floor(growth*stem.segments)*5*6);
    stem.leaves.forEach(leaf=>leaf.mesh.scale.setScalar(THREE.MathUtils.smoothstep(growth,leaf.arrival,leaf.arrival+.2)));
    f.visible=growth>.65;
    f.position.copy(stem.curve.getPoint(growth));f.position.z+=.12;
    f.position.y+=Math.sin(age*.7+data.phase)*.022*growth;
    f.scale.setScalar(data.scale*THREE.MathUtils.smoothstep(growth,.65,1)*(1+Math.sin(age*.6+data.phase)*.007));
    openFlower(f,opening);
    data.opening=opening;data.growth=growth;
  });
  stars.rotation.y=Math.sin(age*.012)*.06;
  spores.rotation.y=age*.025;
  orbitalObjects.forEach(o=>{const a=age*o.speed+o.phase;o.dot.position.set(Math.cos(a)*o.radius,Math.sin(a)*o.radius,0);});
  renderer.info.autoReset=false; renderer.info.reset(); composer.render();
  stats.drawCalls=renderer.info.render.calls; stats.triangles=renderer.info.render.triangles;
  stats.frameMs=performance.now()-start;stats.frames++;
}
function tick(now){frame=0;if(document.hidden||!running){last=0;return;}const dt=last?Math.min(.25,(now-last)/1000):0;last=now;age+=dt;bloomTime=Math.min(BLOOM_DURATION,bloomTime+dt);pulse=Math.max(0,pulse-dt*.65);render();frame=requestAnimationFrame(tick);}
function run(){if(ready&&running&&!frame&&!document.hidden){last=0;frame=requestAnimationFrame(tick);}}
addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;}else run();});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fail();});

// Opt-in diagnostics expose read-only measurements, never production controls.
if(new URLSearchParams(location.search).has('inspect')){
  window.astralDiagnostics=()=>({ready,running,yaw,pitch,zoom,pulse,age,bloomTime,stage:{...stage},...stats,
    materialColors:[mainMaterial?.color.getHexString(),companionMaterial?.color.getHexString()],
    blooms:blooms.map(f=>{const p=f.localToWorld(new THREE.Vector3(0,0,.25)).project(camera);return {role:f.userData.role,position:f.position.toArray(),screen:[(p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2],color:f.getObjectByName('petals').material.color.getHexString(),opening:f.userData.opening,growth:f.userData.growth,morph:f.getObjectByName('petals').morphTargetInfluences[0]};}),
    petalDepth:petalMeshes[0]?.geometry.attributes.position.array.reduce((a,v,i)=>i%3===2?[Math.min(a[0],v),Math.max(a[1],v)]:a,[Infinity,-Infinity]),
    textures:renderer?.info.memory.textures,geometries:renderer?.info.memory.geometries,cacheSize:specimenCache.size,
  });
}
try{build();}catch(error){fail(error);}
