import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import express from 'express';
import {clerkSessionAuth} from '../src/auth.js';
test('production Clerk adapter verifies signature, expiry and authorized party',async () => {
 process.env.CLERK_SECRET_KEY='sk_test_synthetic_not_a_real_key';
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const {privateKey:wrongKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const jwtKey=publicKey.export({type:'spki',format:'pem'}).toString();
 const app=express();app.use(clerkSessionAuth({jwtKey,publishableKey:'pk_test_'+Buffer.from('clerk.test$').toString('base64'),authorizedParties:['http://localhost:5173']}));app.get('/',(_req,res)=>res.json({userId:res.locals.userId}));
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.on('listening',r));const address=server.address();if(!address||typeof address==='string')throw new Error('listen');
 const now=Math.floor(Date.now()/1000);
 const jwt=(overrides={},key=privateKey)=>{
  const h=Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT',kid:'test'})).toString('base64url');
  const p=Buffer.from(JSON.stringify({sub:'user_alice',sid:'sess_test',iss:'https://clerk.test',azp:'http://localhost:5173',iat:now,nbf:now-10,exp:now+300,v:2,fva:[0,-1],...overrides})).toString('base64url');
  return `${h}.${p}.${sign('RSA-SHA256',Buffer.from(`${h}.${p}`),key).toString('base64url')}`;
 };
 const call=(token:string)=>fetch(`http://127.0.0.1:${address.port}`,{headers:{Authorization:`Bearer ${token}`}});
 try {
  const valid=await call(jwt());assert.equal(valid.status,200);assert.equal((await valid.json()).userId,'user_alice');
  assert.equal((await call(jwt({},wrongKey))).status,401);
  assert.equal((await call(jwt({exp:now-60}))).status,401);
  assert.equal((await call(jwt({azp:'https://evil.test'}))).status,401);
  assert.equal((await call('forged')).status,401);
 }finally{await new Promise<void>((r,j)=>server.close(e=>e?j(e):r()));}
});
