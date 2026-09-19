const LIMITS=Object.freeze({buildCells:10000,surveyVolume:262144,queue:4,planBytes:1048576});
// Plan-local coordinates are the language an agent edits. World bounds remain explicit too.
function siteCaps(site,candidate,transform){
 if(!site||!transform)return null;
 const {x:w,z:d}=candidate.dimensions;
 const local=p=>{const [x,y,z]=p.map((n,i)=>n-transform.origin[i]);switch(transform.turns){case 1:return [z,y,d-1-x];case 2:return [w-1-x,y,d-1-z];case 3:return [w-1-z,y,x];default:return [x,y,z];}};
 const box=b=>{const corners=[];for(const x of [b.min[0],b.max[0]-1])for(const y of [b.min[1],b.max[1]-1])for(const z of [b.min[2],b.max[2]-1])corners.push(local([x,y,z]));return {min:[0,1,2].map(i=>Math.min(...corners.map(p=>p[i]))),max:[0,1,2].map(i=>Math.max(...corners.map(p=>p[i]))+1)};};
 const survey={min:site.origin,max:site.origin.map((n,i)=>n+site.dimensions[['x','y','z'][i]])};
 return {coordinateSystem:'plan',boundsConvention:'min inclusive, max exclusive',surveyTopExclusive:survey.max[1],surveyTopPlanExclusive:survey.max[1]-transform.origin[1],survey:box(survey),plot:box(site.plot),frontage:local(site.frontage),protected:site.protected.map(box)};
}
module.exports={LIMITS,siteCaps};
