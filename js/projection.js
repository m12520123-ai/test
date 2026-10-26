/* Image-plane geometry. No values are copied into radar fields. */
(function(){
"use strict";
const S=window.SL;
function directionDifference(target,face,width,height){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return null;
 function vector(pair){
  if(!Array.isArray(pair)||pair.length!==2)return null;
  if(!pair.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1))return null;
  const x=(pair[1].x-pair[0].x)*width,y=-(pair[1].y-pair[0].y)*height;
  if(Math.hypot(x,y)<3)return null;
  return {x,y};
 }
 const a=vector(target),b=vector(face);if(!a||!b)return null;
 let degrees=(Math.atan2(b.y,b.x)-Math.atan2(a.y,a.x))*180/Math.PI;
 degrees=((degrees+540)%360)-180;
 return {degrees,frameTime:Number.isFinite(face[0].t)?face[0].t:null,definition:"Signed CCW image-plane angle between two manually drawn direction arrows; NOT true clubface angle",source:"manual_2d_direction_marks"};
}
S.projection={directionDifference};
})();
