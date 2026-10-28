import assert from 'node:assert/strict';
import {createGame,updateGame} from '../../public/games/8ea04c1db39a/game.mjs';
import {createGame as waterGame,updateGame as waterUpdate,SHORTCUTS} from '../../public/games/b32e0b008dea/game.mjs';
globalThis.localStorage={getItem(){return null;},setItem(){}};
const input=()=>({keys:new Set(),pressed:new Set(),pointer:{x:0,y:0,down:false,inside:false,pressed:false},pointers:[]});
function rocket(mode,dt){const s=createGame();s._pendingAction={action:'mode',value:mode};updateGame(s,dt,input());return s;}
for(const hz of [30,60,120]){
 const dt=1/hz;
 for(const mode of ['soccer1v1','soccer2v2','hoops']){
  const s=rocket(mode,dt);
  for(let frame=0;frame<hz*220&&!s.result;frame++)updateGame(s,dt,input());
  assert.ok(s.result,`${hz}Hz ${mode} does not terminate`);assert.equal(s.match.playerGoals,0);
  assert.ok(s.match.score[1]>s.match.score[0],`${hz}Hz ${mode} inactive player wins/draws: ${s.match.score}`);
  console.log(`PASS ${hz}Hz ${mode} inactive score ${s.match.score}`);
 }
 for(const direction of [-1,1]){
  const s=rocket('hoops',dt);s.match.kickoff=0;s.match.cars=s.match.cars.filter(c=>c.isPlayer);
  const c=s.match.cars[0];Object.assign(c,{x:480-direction*160,y:454,vx:direction*190,angle:direction>0?0:Math.PI});
  s.match.ball={x:480-direction*75,y:448,vx:0,vy:0,r:22};const i=input();i.keys.add(direction>0?'d':'a');
  for(let f=0;f<hz*4&&!s.match.score[0];f++)updateGame(s,dt,i);
  assert.equal(s.match.score[0],1,`${hz}Hz hoop direction ${direction} missed`);
  console.log(`PASS ${hz}Hz physical hoop shot from ${direction>0?'left':'right'}`);
 }
 for(const shortcuts of [false,true]){
  const s=waterGame();s.countdown=0;s.racers=s.racers.filter(r=>r.isPlayer);s.pickups={boosts:[],coins:[],obstacles:[]};
  const p=s.racers[0],i=input();let jumps=0;
  for(let f=0;f<hz*90&&!s.result;f++){
   if(shortcuts&&!p.airborne&&SHORTCUTS.some(z=>p.progress>=z.from&&p.progress<=z.to)){i.pressed.add(' ');jumps++;}
   waterUpdate(s,dt,i);i.pressed.clear();
  }
  assert.ok(s.result,'water did not finish');
  assert.ok(s.raceTime>=(shortcuts?50:65)&&s.raceTime<=(shortcuts?58:68),`${hz}Hz shortcuts=${shortcuts}: ${s.raceTime}s`);
  if(shortcuts)assert.equal(jumps,6);
  console.log(`PASS ${hz}Hz water ${shortcuts?'six shortcuts':'normal route'} ${s.raceTime.toFixed(2)}s`);
 }
}
// Team roles are selected from position, rather than permanently by a slot index.
for(const team of [0,1]){
 const s=rocket('soccer2v2',1/120);s.match.kickoff=0;s.match.playerActiveTimer=0;
 s.match.cars=s.match.cars.filter(c=>!c.isPlayer);const teammates=s.match.cars.filter(c=>c.team===team);
 if(teammates.length<2)continue;
 const [attacker,defender]=teammates;Object.assign(attacker,{x:680,y:456,vx:0,angle:Math.PI});Object.assign(defender,{x:800,y:455,vx:0,angle:Math.PI});
 s.match.ball={x:600,y:448,vx:0,vy:0,r:22};updateGame(s,1/120,input());
 assert.ok(attacker.vx<0,'near AI should attack left');assert.ok(defender.vx>0,'far AI should recover right to defend');
 console.log('PASS 2v2 one attacker and one defender choose opposite actions');
}
