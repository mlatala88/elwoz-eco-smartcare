const assert=require('node:assert/strict'); const fs=require('fs'); const vm=require('vm');
const {setupGasEnvironment}=require('./test-v030-integration');
let passed=0,failed=0;
async function test(name,run){try{await run();passed++;console.log('PASS '+name);}catch(e){failed++;console.error('FAIL '+name+': '+e.message);}}
function load(file,name,extra={}) {const context=vm.createContext({console,setTimeout,clearTimeout,window:{},DataProviderInterface:class {},...extra}); vm.runInContext(fs.readFileSync(file,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'')+'\nthis.Subject='+name,context); return context.Subject;}
function gasWindow(env) {let success,failure; const runner=new Proxy({withSuccessHandler(fn){success=fn;return runner;},withFailureHandler(fn){failure=fn;return runner;}},{get(target,key){return target[key]||((...args)=>{try{success(env[key](...args));}catch(e){failure(e);}});}});return {google:{script:{run:runner}}};}
(async()=>{
const env=setupGasEnvironment(); const Provider=load('manager/js/data/gasProvider.js','AppsScriptDataProvider',{window:gasWindow(env)});const provider=new Provider();
const elements={};const container={querySelector(selector){return elements[selector]||(elements[selector]={value:'',style:{},querySelector:()=>null});},querySelectorAll(){return []}};
const Tickets=load('manager/js/views/ticketsView.js','TicketsView');let navigation;
const view=new Tickets(container,{navigate(...args){navigation=args;}},provider,{});
await test('actual TicketsView defaults through google.script.run bridge',async()=>assert.equal((await provider.getTickets(view.filters)).length,11));
await test('RPC structured failure rejects instead of success',async()=>{env.apiTriggerAiAnalysis=()=>({success:false,error:'Kolejka zajęta'});await assert.rejects(()=>provider.triggerAiAnalysis('x'),/Kolejka zajęta/);});
await test('reset clears filters and route query',async()=>{view.bindEvents();view.filters.metricKey='new';view.filters.period='custom';view.filters.customRange={from:'2026-11-01',to:'2026-11-02'};view.render=()=>{};elements['#btn-reset-filters'].onclick();assert.equal(view.filters.metricKey,undefined);assert.equal(view.filters.customRange,undefined);assert.equal(navigation[0],'tickets');});
await test('late RPC response cannot overwrite newer results',async()=>{const requests=[];view.dataProvider={getTickets:()=>new Promise(resolve=>requests.push(resolve))};view.renderTableHeader=()=>{};let rows;view.renderTableBody=t=>{rows=t};const old=view.loadTickets();const latest=view.loadTickets();requests[1]([{id:'new'}]);await latest;requests[0]([{id:'old'}]);await old;assert.equal(rows[0].id,'new');});
console.log(`${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
})();
