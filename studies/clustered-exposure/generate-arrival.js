// Offline arrival field. Bent petal and stem routes carry a continuous spread
// of light. Times are seconds, encoded over 20 s.
const flowers = [];
function flower(polygon, center, start, tips) {
  const routes = tips.map(([x, y, delay, duration, bend = 0]) => ({
    points: [
      [...center, start + delay],
      [center[0] * .53 + x * .47 + bend, center[1] * .53 + y * .47, start + delay + duration * .43],
      [x, y, start + delay + duration]
    ],
    spread: 43
  }));
  flowers.push({ polygon, routes, start });
}
// Polygon annotations record each flower's anatomy; they never clip the field.
flower([[.445,.075],[.665,.07],[.807,.183],[.789,.265],[.59,.29],[.485,.205]], [.588,.246], 7.3,
  [[.485,.091,0,2.3,-.015],[.646,.087,.6,2.9,.025],[.748,.192,1.2,2.4,.02],[.767,.226,1.7,2.7],[.642,.269,2,1.8]]);
flower([[.078,.237],[.181,.18],[.263,.18],[.309,.269],[.363,.319],[.31,.398],[.138,.407],[.101,.361]], [.282,.319], 5.5,
  [[.191,.199,.3,2.5,.015],[.09,.304,0,2.4,-.025],[.121,.391,1.1,2.2],[.295,.379,1.6,2.4]]);
flower([[.302,.217],[.393,.174],[.477,.185],[.536,.262],[.473,.32],[.356,.33]], [.423,.304], 7.1,
  [[.362,.218,0,2.2,-.013],[.425,.19,.8,2.4],[.509,.245,1.5,2.1,.008]]);
flower([[.603,.26],[.704,.247],[.751,.296],[.83,.34],[.841,.436],[.708,.462],[.623,.418]], [.665,.386], 5.9,
  [[.663,.265,0,2.6],[.743,.302,.7,2.5],[.824,.366,1.25,2.4],[.79,.421,2,2.1]]);
flower([[.627,.452],[.711,.438],[.815,.51],[.805,.623],[.697,.641],[.637,.554]], [.665,.502], 7.0,
  [[.755,.466,0,2.2],[.79,.59,.6,2.9,.012],[.69,.626,1.5,2.7,-.014]]);
flower([[.125,.542],[.262,.52],[.326,.55],[.334,.645],[.253,.713],[.157,.68]], [.301,.565], 10.1,
  [[.144,.552,0,2.0],[.173,.635,.6,2.4,-.01],[.274,.696,1.25,2.5]]);
flower([[.347,.631],[.419,.589],[.49,.644],[.519,.73],[.44,.741],[.365,.717]], [.444,.626], 11.0,
  [[.363,.681,0,2.3],[.438,.725,.7,2.6],[.496,.703,1.4,2.0]]);
flower([[.582,.652],[.677,.658],[.791,.691],[.765,.798],[.64,.815],[.591,.764]], [.626,.684], 11.7,
  [[.772,.69,0,2.2,.014],[.762,.768,.7,2.5],[.635,.806,1.35,2.4,-.01]]);
flower([[.171,.424],[.243,.41],[.305,.424],[.276,.486],[.207,.505],[.16,.474]], [.271,.435], 10.8,
  [[.185,.433,0,1.5],[.195,.477,.8,1.9]]);
flower([[.798,.437],[.854,.458],[.896,.51],[.864,.548],[.802,.514]], [.81,.467], 12.0,
  [[.86,.481,0,1.6],[.859,.535,.7,2.1]]);
flower([[.748,.241],[.806,.234],[.875,.263],[.89,.297],[.815,.319],[.773,.287]], [.795,.285], 12.6,
  [[.801,.245,0,1.5],[.867,.271,.65,1.8],[.857,.309,1.1,1.6]]);
flower([[.359,.121],[.409,.107],[.437,.142],[.42,.174],[.382,.178]], [.391,.171], 13.1,
  [[.377,.137,0,1.5],[.412,.12,.7,1.7]]);
flower([[.581,.614],[.631,.592],[.675,.622],[.677,.658],[.618,.671]], [.607,.625], 13.3,
  [[.65,.606,0,1.5],[.658,.653,.65,1.7]]);
// The coral bloom is the focal front plane. Petals commit one at a time.
flower([[.283,.455],[.335,.392],[.357,.331],[.426,.299],[.503,.278],[.557,.295],[.614,.338],[.602,.397],[.69,.4],[.735,.437],[.664,.481],[.642,.545],[.537,.558],[.437,.578],[.35,.541]], [.523,.501], 3.05,
  [[.426,.332,0,2.45,-.018],[.493,.29,.7,2.9,.02],[.57,.329,1.3,2.65],[.681,.419,1.95,2.1,.018],[.318,.448,2.3,2.45,-.022],[.39,.54,2.8,2.0],[.591,.531,3.2,1.8]]);

const stems = [
  [[.507,.964,0],[.493,.877,.45],[.481,.805,.9],[.495,.7,1.55],[.519,.548,2.8]],
  [[.442,.925,.35],[.443,.864,.7],[.468,.814,1.1],[.54,.75,1.8],[.617,.643,2.85]],
  [[.495,.926,.4],[.481,.831,1],[.435,.776,1.6],[.378,.711,2.1]],
  [[.515,.953,.7],[.527,.873,1.3],[.563,.812,1.9],[.609,.743,2.65]],
  [[.482,.858,1.2],[.485,.755,1.8],[.484,.665,2.3],[.522,.558,2.9]]
].map(points => ({ points, spread: 170 }));
const allRoutes = [...stems, ...flowers.flatMap(f => f.routes)];
function routeTime(px,py,routes) {
  let time=17;
  for(const route of routes) for(let i=1;i<route.points.length;i++) {
    const a=route.points[i-1],b=route.points[i];
    const dx=b[0]-a[0],dy=(b[1]-a[1])*1.25;
    const vx=px-a[0],vy=(py-a[1])*1.25;
    const u=Math.max(0,Math.min(1,(vx*dx+vy*dy)/(dx*dx+dy*dy)));
    const distance=Math.hypot(vx-u*dx,vy-u*dy);
    time=Math.min(time,a[2]+(b[2]-a[2])*u+distance*route.spread+distance*distance*90);
  }
  return time;
}
function arrivalMap(image) {
  const width=560,height=Math.round(width*image.height/image.width);
  const work=document.createElement('canvas'); work.width=width;work.height=height;
  const ctx=work.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,width,height);
  const pixels=ctx.getImageData(0,0,width,height).data;
  const paper=(pixels[0]+pixels[1]+pixels[2])/765;
  const out=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    const px=x/width,py=y/height;
    let time=routeTime(px,py,allRoutes);
    const k=(y*width+x)*4;
    const luminance=(pixels[k]+pixels[k+1]+pixels[k+2])/765;
    // Fibres arrive ahead of their membranes; a fixed slight hesitation remains.
    const texture=Math.sin(px*437+Math.sin(py*73)*3)*Math.sin(py*563+px*91)*.085;
    time=Math.min(17,Math.max(0,time+texture-Math.abs(luminance-paper)*.55));
    out[k]=out[k+1]=out[k+2]=Math.round(time/20*255);out[k+3]=255;
  }
  ctx.putImageData(new ImageData(out,width,height),0,0);
  document.body.append(work);window.arrivalDataURL=work.toDataURL('image/png');
}
const image=new Image();image.onload=()=>arrivalMap(image);image.src='material.png';
