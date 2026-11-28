const assert = require('node:assert/strict');
const { setupGasEnvironment } = require('./test-v030-integration');
const fs = require('fs');
const vm = require('vm');
let passed = 0, failed = 0;
function test(name, run) { try { run(); passed++; console.log('PASS '+name); } catch(e) { failed++; console.error('FAIL '+name+': '+e.message); } }
const env = setupGasEnvironment();
const defaults = {search:'',status:'all',priority:'all',category:'all',assignee:'all',aiState:'all',deadlineFilter:'all',sortField:'timestamp',sortOrder:'desc'};
const sheet = env.SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ZGŁOSZENIA');
const set = (row, field, value) => sheet.data[row][sheet.data[0].indexOf(field)] = value;
// Exact reported shape: 12 tickets, nine new and nine without first response.
sheet.data.push([...sheet.data[11]]); set(12,'ID Zgłoszenia','ELW-2026-0012');
for(let i=1;i<=12;i++) { set(i,'Status',i<=9?'Nowe':'Rozwiązane'); set(i,'Data pierwszego kontaktu',i<=9?'':'2026-11-26 12:00'); }
set(1,'Pracownik odpowiedzialny',''); set(2,'Stan analizy AI','Gotowa');
const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Warsaw'}).format(new Date());
set(1,'Termin następnego działania',today+' 23:59'); set(10,'Termin następnego działania',today+' 12:00');
set(1,'Następne działanie',''); set(1,'Ocena satysfakcji (1-5)',1);
set(1,'Adres e-mail','synthetic@example.invalid'); set(1,'Notatka pracownika','szukana notatka');
test('reported 12/9/9 with exact UI defaults',()=> {const s=env.apiGetCsiStats();assert.equal(s.total,12);assert.equal(s.newCount,9);assert.equal(s.noFirstResponse,9);assert.equal(env.apiGetTickets(defaults).length,12);});
for(const value of ['all','Wszystkie','Wszyscy','',null]) test('all sentinel '+value,()=>assert.equal(env.apiGetTickets({...defaults,status:value,priority:value,category:value,assignee:value,aiState:value}).length,12));
for(const [key,value,expected] of [['status','Nowe',9],['assignee','Nieprzypisany',1],['aiState','Przeanalizowano',10],['search','synthetic@example.invalid',1],['search','szukana notatka',1],['deadlineFilter','no_step',1],['metricKey','low_rated',1]]) test(key+'='+value,()=>assert.equal(env.apiGetTickets({...defaults,[key]:value}).length,expected));
for(const [metric,stat] of Object.entries({all:'total',new:'newCount',no_response:'noFirstResponse',urgent:'urgent',overdue:'overdue',today:'dueToday',no_step:'noNextStep',awaiting_citizen:'awaitingCitizen',awaiting_company:'awaitingCompany',resolved:'resolved',rated:'feedbackCount',review_invites:'reviewInvitesCount'})) test('KPI '+metric,()=>assert.equal(env.apiGetTickets({...defaults,metricKey:metric}).length,env.apiGetCsiStats()[stat]));
test('today excludes closed; same deadline/KPI',()=> {assert.equal(env.apiGetCsiStats().dueToday,1);assert.equal(env.apiGetTickets({...defaults,deadlineFilter:'today'}).length,1);});
test('sort id ascending',()=>assert.equal(env.apiGetTickets({...defaults,sortField:'id',sortOrder:'asc'})[0].id,'ELW-2026-0001'));
set(1,'Sygnatura czasowa','2026-11-26 00:00'); set(2,'Sygnatura czasowa','2026-11-26 23:59'); set(3,'Sygnatura czasowa','');
test('custom inclusive whole Warsaw day excludes undated',()=>assert.equal(env.apiGetTickets({...defaults,period:'custom',customRange:{from:'2026-11-26',to:'2026-11-26'}}).length,11));
test('invalid date range rejected',()=>assert.throws(()=>env.apiGetTickets({period:'custom',customRange:{from:'2026-11-30',to:'2026-11-20'}}),/zakres|dat/i));
test('no duplicate global GAS functions',()=>{const names=[];for(const file of fs.readdirSync('google').filter(f=>f.endsWith('.gs')))for(const m of fs.readFileSync('google/'+file,'utf8').matchAll(/^function\s+(\w+)\s*\(/gm))names.push(m[1]);assert.deepEqual(names.filter((n,i)=>names.indexOf(n)!==i),[]);});
console.log(`${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
