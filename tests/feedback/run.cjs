const {spawnSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
function run(args){
 const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});
 if(result.status!==0)process.exit(result.status||1);
}
run(['--test','tests/feedback/root.test.mjs','tests/feedback/combat-regression.mjs']);
for(const script of ['sports-regressions.mjs','sports-frame-rates.mjs','puzzles-regression.mjs','puzzles-stress.mjs','combat-simulation.mjs']) run(['tests/feedback/'+script]);
console.log('ALL GAME REGRESSION CHECKS PASSED');
