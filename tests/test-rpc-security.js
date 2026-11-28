const assert=require('node:assert/strict');const fs=require('fs');const {setupGasEnvironment}=require('./test-v030-integration');let passed=0,failed=0;
function test(n,f){try{f();passed++;console.log('PASS '+n);}catch(e){failed++;console.error('FAIL '+n+': '+e.message);}}
const env=setupGasEnvironment();
const permissions={apiGetTickets:[],apiGetTicketById:['x'],apiGetStaff:[],apiGetSettings:[],apiGetCommunications:[],apiGetCsiStats:[],apiGetDiagnostics:[],apiRunDiagnosticsTest:[],apiCreateTicket:[{}],apiUpdateTicket:['x',{}],apiAddCommunication:[{ticketId:'x'}],apiPolishMessageWithAi:['text'],apiTriggerAiAnalysis:['x'],apiReconcileUnprocessedTickets:[],apiGetTicketsList:[],apiGetTicketDetails:['x'],apiGetAiAnalysis:['x'],apiGetCommunicationHistory:['x'],apiGetDashboardStats:[],apiGetNextActionsList:[],apiUpdateSettings:[{}]};
env.Session.getActiveUser=()=>({getEmail:()=>''});
for(const [name,args] of Object.entries(permissions)) test('anonymous denied '+name,()=>assert.throws(()=>env[name](...args),/ACCESS_DENIED/));
test('old PIN never authenticates',()=>assert.equal(env.apiVerifyUser('wsb.student.tester@gmail.com','1926').success,false));
for(const name of ['getSmartCareSettings','getTicketDataByRow','polishMessageWithAiDirect','processAiAnalysisQueue','scheduledQueueAndReconcile','handleNewTicketSubmit','reconcileUnprocessedFormResponses','getVerifiedGeminiModel','configureGeminiApiKey']) test('legacy helper inaccessible or guarded '+name,()=>{if(env[name])assert.throws(()=>env[name](),/ACCESS_DENIED/);});
test('anonymous direct send blocked without side effects',()=>{let mails=0;env.MailApp.sendEmail=()=>mails++;assert.throws(()=>env.processSendEmail({ticketId:'x',subject:'hello',body:'safe text'}),/ACCESS_DENIED/);assert.equal(mails,0);});
test('doPost does not trust operator object',()=>{const res=JSON.parse(env.doPost({postData:{contents:JSON.stringify({action:'apiGetTickets',operator:{email:'wsb.student.tester@gmail.com',permissions:['admin']},payload:[]})}}));assert.equal(res.success,false);assert.match(res.error,/ACCESS_DENIED/);});
console.log(`${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
