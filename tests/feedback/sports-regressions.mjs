import assert from 'node:assert/strict';
import { createGame, updateGame, hoopRects } from '../../public/games/로켓 리그 사이드와이프/game.mjs';
import { CONFIG } from '../../public/games/로켓 리그 사이드와이프/config.mjs';
import { createGame as waterGame, updateGame as waterUpdate, SHORTCUTS, handleCanvasTap } from '../../public/games/워터슬라이드 레이스/game.mjs';
globalThis.localStorage = { getItem() { return null; }, setItem() {} };
const input = () => ({ keys: new Set(), pressed: new Set(), pointer: {x:0,y:0,down:false,inside:false,pressed:false}, pointers:[] });
function rocket(mode) {
  const s=createGame(); s._pendingAction={action:'mode',value:mode}; updateGame(s,1/120,input()); return s;
}
function soloWater() {
  const s=waterGame();s.countdown=0;s.racers=s.racers.filter(r=>r.isPlayer);s.pickups={boosts:[],obstacles:[],coins:[]};return s;
}
const tests=[];
function check(name,fn){try{const detail=fn();console.log('PASS',name,detail||'');}catch(e){tests.push(name);console.error('FAIL',name,e.message);}}
// An inactive player must not win because the opponent repeatedly shoots into its own goal.
check('1v1 inactive player loses instead of receiving AI own goals',()=>{
 const s=rocket('soccer1v1');for(let f=0;f<24000&&!s.result;f++)updateGame(s,1/120,input());
 assert.ok(s.match.score[1]>s.match.score[0],`score ${s.match.score}`);assert.equal(s.match.playerGoals,0);return `score ${s.match.score}`;
});
// Team goals and personal goals have distinct reward/stat effects.
check('an untouched opponent own goal gives no personal goal',()=>{
 const s=rocket('soccer1v1');s.match.kickoff=0;s.match.ball={x:CONFIG.fieldRight-CONFIG.ballRadius-10,y:CONFIG.floorY-70,vx:500,vy:0,r:CONFIG.ballRadius};
 for(let f=0;f<10;f++)updateGame(s,1/120,input());assert.equal(s.match.score[0],1);assert.equal(s.match.playerGoals,0);
});
check('2v2 inactive player cannot farm personal goal rewards',()=>{
 const s=rocket('soccer2v2');for(let f=0;f<24000&&!s.result;f++)updateGame(s,1/120,input());
 assert.equal(s.match.playerGoals,0);assert.ok(s.match.score[1]>=s.match.score[0],`score ${s.match.score}`);return `score ${s.match.score}`;
});
// A repeatable novice input: drive into a stationary floor ball from the left.
check('hoops grounded approach can put a physical ball through the basket',()=>{
 const s=rocket('hoops');s.match.kickoff=0;s.match.cars=s.match.cars.filter(c=>c.isPlayer);
 const c=s.match.cars[0],center=CONFIG.width/2;Object.assign(c,{x:center-160,y:CONFIG.floorY-CONFIG.carHalfH,vx:190,angle:0});s.match.ball={x:center-75,y:CONFIG.floorY-CONFIG.ballRadius,vx:0,vy:0,r:CONFIG.ballRadius};
 const i=input();i.keys.add('d');let highest=CONFIG.floorY-CONFIG.ballRadius;
 for(let f=0;f<360&&!s.match.score[0];f++){updateGame(s,1/120,i);highest=Math.min(highest,s.match.ball.y);}
 assert.equal(s.match.score[0],1,`apex ${highest}, basket y ${hoopRects().cy}`);return `apex ${highest.toFixed(1)}`;
});
check('water full route lasts about one minute',()=>{
 const s=soloWater();for(let f=0;f<12000&&!s.result;f++)waterUpdate(s,1/120,input());
 assert.ok(s.raceTime>=55&&s.raceTime<=75,`time ${s.raceTime}`);assert.ok(s.result);return `${s.raceTime.toFixed(2)}s`;
});
check('water ordinary jump avoids an obstacle without losing normal travel distance',()=>{
 const s=soloWater();s.pickups.obstacles=[{t:50,lane:0,hit:false}];const i=input();i.pressed.add(' ');
 for(let f=0;f<120;f++){waterUpdate(s,1/120,i);i.pressed.clear();}
 assert.ok(s.racers[0].progress>=140,`progress ${s.racers[0].progress}`);assert.equal(s.racers[0].slowTimer,0);
});
check('water shortcut beats ordinary riding by a useful distance',()=>{
 const s=soloWater();s.racers[0].progress=SHORTCUTS[0].from+5;const start=s.racers[0].progress;const i=input();i.pressed.add(' ');
 for(let f=0;f<120;f++){waterUpdate(s,1/120,i);i.pressed.clear();}
 assert.ok(s.racers[0].progress-start>220,`gain ${s.racers[0].progress-start}`);assert.equal(s.racers[0].airborne,false);
});
check('water holding jump touch button does not steer toward the right edge',()=>{
 const s=soloWater();const i=input();i.pointer={x:332,y:622,down:true,inside:true,pressed:true};i.pointers=[{id:1,...i.pointer}];
 for(let f=0;f<240;f++){waterUpdate(s,1/120,i);i.pointer.pressed=false;}
 assert.ok(Math.abs(s.racers[0].lane)<0.05,`lane ${s.racers[0].lane}`);assert.equal(s.racers[0].fallen,false);
});
check('water skin hit region matches the rendered countdown cards',()=>{
 const s=waterGame();s.save.coins=100;assert.equal(handleCanvasTap(s,50,634,{width:390,height:700}),true);
});
check('water obstacle collision triggers once per racer rather than every frame',()=>{
 const s=soloWater();s.pickups.obstacles=[{t:10,lane:0,hit:false}];
 for(let f=0;f<240;f++)waterUpdate(s,1/120,input());assert.ok(s.racers[0].progress>180,`progress ${s.racers[0].progress}`);
});
if(tests.length){console.error(`${tests.length} regression(s) failed`);process.exitCode=1;}
