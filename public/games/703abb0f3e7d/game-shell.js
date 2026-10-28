// Shared input, round lifecycle and platform menu. Each template owns its rules and art.
export function createInputState(){return{keys:new Set(),pressed:new Set(),pointer:{x:0,y:0,down:false,pressed:false,released:false,inside:false},pointers:[]};}
export function clearInputState(input){input.keys.clear();input.pressed.clear();input.pointer.down=false;input.pointer.pressed=false;input.pointer.released=false;input.pointers=[];}
export function createRunner(options){
 const runner={state:options.create(),time:0,mode:'start',start(input){clearInputState(input);this.mode='play';},pause(input){if(this.mode==='play'){this.mode='pause';clearInputState(input);}},resume(input){if(this.mode==='pause'){clearInputState(input);this.mode='play';}},restart(input){this.state=options.create();this.time=0;clearInputState(input);this.mode='play';},tick(dt,input){
  if(this.mode==='play'){const delta=Math.max(0,Math.min(Number(dt)||0,.05));this.time+=delta;options.update(this.state,delta,input);if(this.state.result){this.mode='result';clearInputState(input);}}
  input.pressed.clear();input.pointer.pressed=false;input.pointer.released=false;
 }};return runner;
}
export function mountGame(options){
 const canvas=document.getElementById('game-canvas'),context=canvas.getContext('2d'),input=createInputState(),runner=createRunner(options);
 const width=options.width||480,height=options.height||680,title=window.GAME_CONFIG?.title||options.title;
 const frame=document.getElementById('game-frame'),overlay=document.getElementById('round-overlay'),heading=document.getElementById('round-heading'),description=document.getElementById('round-description');
 const primary=document.getElementById('round-primary'),restart=document.getElementById('round-restart'),pause=document.getElementById('pause-game'),help=document.getElementById('game-help');
 document.title=title;document.querySelectorAll('[data-game-title]').forEach(el=>el.textContent=title);
 document.getElementById('game-credit').textContent=window.GAME_CONFIG?.creator?'기획·디자인: '+window.GAME_CONFIG.creator:'먼저 해 보고 나만의 게임으로 바꿔 봐!';
 help.textContent=options.controls||'';canvas.setAttribute('aria-label',title+' 게임 화면');canvas.tabIndex=0;
 for(const[key,value]of Object.entries(options.theme||{}))if(typeof value==='string')document.documentElement.style.setProperty('--'+key,value);
 frame.style.setProperty('--game-ratio',width+'/'+height);
 function resize(){const ratio=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);context.setTransform(ratio,0,0,ratio,0,0);}
 resize();window.addEventListener('resize',resize);
 const active=new Map();
 function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*width/r.width,y:(e.clientY-r.top)*height/r.height};}
 function sync(e,kind){const p=point(e);Object.assign(input.pointer,p,{inside:p.x>=0&&p.y>=0&&p.x<=width&&p.y<=height});if(kind==='down'){input.pointer.down=true;input.pointer.pressed=true;active.set(e.pointerId,{id:e.pointerId,...p,down:true});}else if(kind==='move'){if(active.has(e.pointerId))active.set(e.pointerId,{id:e.pointerId,...p,down:true});}else{active.delete(e.pointerId);input.pointer.down=active.size>0;input.pointer.released=true;}input.pointers=[...active.values()];}
 canvas.addEventListener('pointerdown',e=>{if(runner.mode!=='play')return;e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);sync(e,'down');});
 canvas.addEventListener('pointermove',e=>{if(runner.mode==='play')sync(e,'move');});
 canvas.addEventListener('pointerup',e=>{if(runner.mode==='play')sync(e,'up');});
 const resetInput=()=>{active.clear();clearInputState(input);};canvas.addEventListener('pointercancel',resetInput);canvas.addEventListener('lostpointercapture',e=>{active.delete(e.pointerId);if(active.size===0)input.pointer.down=false;input.pointers=[...active.values()];});
 function renderOverlay(){
  const mode=runner.mode;overlay.hidden=mode==='play';pause.hidden=mode!=='play';restart.hidden=mode==='start';
  if(mode==='start'){heading.textContent=title;description.textContent=options.description||'';primary.textContent='게임 시작';}
  if(mode==='pause'){heading.textContent='잠깐 쉬어 가기';description.textContent='준비되면 계속해 봐!';primary.textContent='계속하기';}
  if(mode==='result'){heading.textContent=runner.state.result.success?'해냈어!':'한 번 더 해볼까?';description.textContent=runner.state.result.message||'';primary.textContent='다시 하기';restart.hidden=true;}
 }
 function play(){if(runner.mode==='start')runner.start(input);else if(runner.mode==='pause')runner.resume(input);else runner.restart(input);renderOverlay();canvas.focus({preventScroll:true});}
 primary.addEventListener('click',play);restart.addEventListener('click',()=>{runner.restart(input);renderOverlay();canvas.focus({preventScroll:true});});
 pause.addEventListener('click',()=>{runner.pause(input);resetInput();renderOverlay();});
 window.addEventListener('keydown',e=>{if(e.target.closest?.('dialog,input,textarea,select,button,summary,a,#maker-guide'))return;const key=e.key.toLowerCase();if(key==='escape'){if(runner.mode==='play')runner.pause(input);else if(runner.mode==='pause')runner.resume(input);resetInput();renderOverlay();return;}if(runner.mode!=='play')return;if(['arrowleft','arrowright','arrowup','arrowdown',' ','enter','w','a','s','d'].includes(key))e.preventDefault();if(!input.keys.has(key))input.pressed.add(key);input.keys.add(key);});
 window.addEventListener('keyup',e=>input.keys.delete(e.key.toLowerCase()));
 function suspend(){resetInput();runner.pause(input);renderOverlay();}window.addEventListener('blur',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});
 let last=performance.now(),previousMode=runner.mode;
 function frameLoop(now){const dt=(now-last)/1000;last=now;runner.tick(dt,input);context.save();context.clearRect(0,0,width,height);try{options.render(context,runner.state,{width,height,time:runner.time});}finally{context.restore();}if(previousMode!==runner.mode){renderOverlay();previousMode=runner.mode;}requestAnimationFrame(frameLoop);}
 renderOverlay();requestAnimationFrame(frameLoop);
 return runner;
}
