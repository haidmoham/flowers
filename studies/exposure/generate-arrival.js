// Open generate-arrival.html to rebuild the arrival field from the authored paths.
const routes=[
 {spread:105,points:[[.531,.974,-.6],[.502,.879,-.05],[.481,.817,.5],[.435,.759,.9],[.389,.7,1.4],[.372,.641,1.8],[.385,.579,2.15],[.423,.496,2.65],[.472,.391,3.15]]},
 {spread:110,points:[[.449,.772,1.7],[.447,.692,2.3],[.472,.617,3.0],[.511,.558,3.8],[.575,.526,5.0],[.637,.523,6.4]]},
 {spread:33,points:[[.469,.389,3.25],[.397,.31,3.8],[.343,.243,4.8],[.286,.168,5.4],[.24,.126,6.3]]},
 {spread:36,points:[[.469,.384,4.1],[.456,.297,4.65],[.457,.232,5.8],[.457,.148,6.9],[.465,.121,7.1]]},
 {spread:39,points:[[.468,.39,5.2],[.39,.382,5.75],[.327,.374,6.1],[.259,.347,6.8],[.229,.315,7.2]]},
 {spread:35,points:[[.473,.394,6.1],[.54,.366,6.8],[.598,.337,7.4],[.673,.31,8.1],[.715,.315,8.6]]},
 {spread:38,points:[[.445,.354,5.8],[.338,.311,6.6],[.254,.281,7.4],[.166,.258,8.1]]},
 {spread:75,points:[[.47,.395,7.3],[.434,.465,8.1],[.406,.507,8.8]]},
 {spread:33,points:[[.635,.524,8.2],[.699,.492,9.1],[.745,.48,9.5],[.788,.504,10.3],[.825,.537,10.8]]},
 {spread:34,points:[[.643,.526,9.0],[.664,.585,10.0],[.695,.645,10.8],[.711,.716,11.8]]},
 {spread:36,points:[[.641,.53,10.0],[.724,.559,10.7],[.786,.605,11.4],[.84,.647,12.1]]},
 {spread:46,points:[[.628,.521,9.5],[.569,.506,10.3],[.531,.535,11.3]]},
 {spread:140,points:[[.694,.669,12.7],[.712,.778,13.5],[.68,.855,14.3],[.66,.893,15.1]]},
 {spread:160,points:[[.456,.409,12.5],[.369,.541,13.0],[.295,.658,13.8],[.277,.783,14.5],[.268,.828,15.0]]},
 {spread:145,points:[[.535,.427,12.7],[.516,.532,13.5],[.492,.632,14.5]]}
];
const segments=[];for(const route of routes)for(let i=1;i<route.points.length;i++)segments.push({a:route.points[i-1],b:route.points[i],spread:route.spread});
function arrivalMap(image){const width=420,height=Math.round(width*image.height/image.width),work=document.createElement('canvas');work.width=width;work.height=height;const ctx=work.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,width,height);const pixels=ctx.getImageData(0,0,width,height).data,out=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const px=x/width,py=y/height;let time=17;for(const s of segments){const dx=s.b[0]-s.a[0],dy=(s.b[1]-s.a[1])*1.25;const vx=px-s.a[0],vy=(py-s.a[1])*1.25;const u=Math.max(0,Math.min(1,(vx*dx+vy*dy)/(dx*dx+dy*dy)));const distance=Math.hypot(vx-u*dx,vy-u*dy);const candidate=s.a[2]+(s.b[2]-s.a[2])*u+distance*s.spread;time=Math.min(time,candidate);}const k=(y*width+x)*4;const luminance=(pixels[k]+pixels[k+1]+pixels[k+2])/765;const texture=(Math.sin(px*437+Math.sin(py*73)*3)*Math.sin(py*563+px*91))*.065;time+=texture-luminance*.42;out[k]=Math.round(Math.max(0,Math.min(20,time))/20*255);out[k+1]=out[k];out[k+2]=out[k];out[k+3]=255;}
 ctx.putImageData(new ImageData(new Uint8ClampedArray(out), width, height), 0, 0); document.body.append(work); window.arrivalDataURL = work.toDataURL('image/png');}

const image=new Image();image.onload=()=>arrivalMap(image);image.src='material.png';
