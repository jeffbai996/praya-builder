const {apartment}=require('./apartment.cjs');
const {terrace}=require('./terrace.cjs');
const {library}=require('./library.cjs');
const {clinic}=require('./clinic.cjs');
const {market}=require('./market.cjs');
const {school}=require('./school.cjs');
const {clinicR1}=require('./clinic-r1.cjs');
const {marketR1}=require('./market-r1.cjs');
const {schoolR1}=require('./school-r1.cjs');
const {postmodern}=require('./postmodern.cjs');
const {braemarClinic}=require('./braemar-clinic.cjs');
const {braemarClinicR1}=require('./braemar-clinic-r1.cjs');
const {mansion}=require('./mansion.cjs');
const {braemarClinicR2}=require('./braemar-clinic-r2.cjs');
const {postmodernR1}=require('./postmodern-r1.cjs');
const {postmodernR2}=require('./postmodern-r2.cjs');
const {mansionR1}=require('./mansion-r1.cjs');
const site='Synthetic site · location unassigned';
const projects=[
  {id:'courtyard',planId:'courtyard-apartments',caseId:'PBD-001',name:'Courtyard Apartments',
    type:'Multi-unit residential',summary:'Six homes around a shared stair, with planted balconies and a communal roof terrace.',
    site,floors:3,units:'6 homes',latest:'r2',accent:'sage',
    revisions:[{id:'r2',label:'R02 · Modern & refined'},{id:'r1',label:'R01 · Planted & sheltered'},{id:'r0',label:'R00 · Initial study'}],
    layers:[{value:24,label:'Full building'},{value:16,label:'Roof removed'},{value:14,label:'Level 03 cutaway'},{value:9,label:'Level 02 cutaway'},{value:4,label:'Level 01 cutaway'}]},
  {id:'terrace',planId:'terrace-mews',caseId:'PBD-002',name:'Terrace Mews',
    type:'Duplex housing',summary:'Two independent two-storey homes, sheltered balconies and a planted pedestrian lane.',
    site,floors:2,units:'2 homes',latest:'r0',accent:'sand',revisions:[{id:'r0',label:'R00 · Garden duplexes'}],
    layers:[{value:24,label:'Full building'},{value:11,label:'Roof removed'},{value:9,label:'Upper floor cutaway'},{value:4,label:'Ground floor cutaway'}]},
  {id:'library',planId:'civic-reading-room',caseId:'PBD-003',name:'Civic Reading Room',
    type:'Civic & cultural',summary:'A glazed neighbourhood library with a double-height hall, rooflights and a sheltered forecourt.',
    site,floors:1,units:'Public library',latest:'r0',accent:'blue',revisions:[{id:'r0',label:'R00 · Reading pavilion'}],
    layers:[{value:24,label:'Full building'},{value:8,label:'Roof removed'},{value:5,label:'Reading hall cutaway'}]},
  {id:'clinic',planId:'garden-medical-clinic',caseId:'PBD-004',name:'Garden Medical Clinic',
    type:'Neighbourhood healthcare',summary:'L-shaped care wings around a planted arrival court, with a garden entrance, treatment suite and screened roof plant.',
    site,floors:1,units:'2 exam rooms + treatment',latest:'r1',accent:'blue',revisions:[{id:'r1',label:'R01 · L-shaped garden court'},{id:'r0',label:'R00 · Garden clinic'}],
    layers:[{value:24,label:'Full building'},{value:8,label:'Roof removed'},{value:5,label:'Care rooms cutaway'},{value:3,label:'Ground floor plan'}]},
  {id:'market',planId:'go-corner-market',caseId:'PBD-005',name:'Go Corner Market',
    type:'Convenience retail',summary:'A chamfered corner entrance, stocked retail hall, coffee counter and offset rear service wing.',
    site,floors:1,units:'Market + coffee bar',latest:'r1',accent:'sage',revisions:[{id:'r1',label:'R01 · Chamfered corner market'},{id:'r0',label:'R00 · Neighbourhood market'}],
    layers:[{value:24,label:'Full building'},{value:7,label:'Roof removed'},{value:5,label:'Retail hall cutaway'},{value:3,label:'Ground floor plan'}]},
  {id:'school',planId:'parkside-elementary',caseId:'PBD-006',name:'Parkside Elementary',
    type:'Primary education',summary:'U-shaped classroom wings around an open learning court, with a glazed rear connector and sheltered play areas.',
    site,floors:2,units:'4 classrooms',latest:'r1',accent:'sand',revisions:[{id:'r1',label:'R01 · U-shaped learning court'},{id:'r0',label:'R00 · Neighbourhood school'}],
    layers:[{value:24,label:'Full building'},{value:13,label:'Roof removed'},{value:10,label:'Upper floor cutaway'},{value:5,label:'Ground floor cutaway'}]},
  {id:'postmodern',planId:'rosedale-court',caseId:'PBD-007',name:'Rosedale Court',
    type:'Urban apartments',summary:'Six storeys with framed elevations, smoked-pane balconies, shared garden loggias and complete studio interiors.',
    site,floors:6,units:'11 homes',latest:'r2',accent:'sage',revisions:[{id:'r2',label:'R02 · Complete elevations & interiors'},{id:'r1',label:'R01 · Praya residential redesign'},{id:'r0',label:'R00 · Six-storey study'}],
    layers:[{value:32,label:'Full building'},{value:25,label:'Roof removed'},...Array.from({length:6},(_,i)=>({value:24-i*4,label:`Level ${String(6-i).padStart(2,'0')} cutaway`}))]},
  {id:'braemar',planId:'braemarhealth-hillside-clinic',caseId:'PBD-008',name:'BraemarHealth Hillside Clinic',
    type:'Urban medical clinic',summary:'A postmodern care building with an arched entrance, warm masonry, stepped cornice and a standalone cyan-and-lime medical mark.',
    site,floors:3,units:'4 exam rooms + 2 treatment rooms',latest:'r2',accent:'blue',revisions:[{id:'r2',label:'R02 · Postmodern & logo-led'},{id:'r1',label:'R01 · Glazing & signage'},{id:'r0',label:'R00 · BraemarHealth study'}],
    layers:[{value:32,label:'Full building'},{value:19,label:'Roof removed'},{value:16,label:'Treatment floor cutaway'},{value:10,label:'Consultation floor cutaway'},{value:4,label:'Reception floor cutaway'}]},
  {id:'mansion',planId:'braemar-frame-house',caseId:'PBD-009',name:'Braemar Frame House',
    type:'Garden residence',summary:'A wide pale frame, timber-screened sides, a rear garden colonnade and furnished gallery terrace. Three bedrooms, a pool and a roof lounge.',
    site,floors:2,units:'3 bedrooms + roof lounge',latest:'r1',accent:'sage',revisions:[{id:'r1',label:'R01 · Garden elevations & joinery'},{id:'r0',label:'R00 · Framed garden house'}],
    layers:[{value:24,label:'Full building'},{value:17,label:'Roof lounge cutaway'},{value:13,label:'Main roof removed'},{value:10,label:'Bedroom floor cutaway'},{value:5,label:'Living floor cutaway'}]},
];
function createPlan(id,revision){
  const project=projects.find(p=>p.id===id);
  if(!project||!project.revisions.some(r=>r.id===revision))throw Error('Unknown project or revision');
  const factories={courtyard:()=>apartment(revision),terrace,library,postmodern:revision==='r2'?postmodernR2:revision==='r1'?postmodernR1:postmodern,mansion:revision==='r1'?mansionR1:mansion,braemar:revision==='r2'?braemarClinicR2:revision==='r1'?braemarClinicR1:braemarClinic,
    clinic:revision==='r1'?clinicR1:clinic,market:revision==='r1'?marketR1:market,school:revision==='r1'?schoolR1:school};
  return factories[id]();
}
module.exports={projects,createPlan};
