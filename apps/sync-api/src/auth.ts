import {clerkMiddleware,getAuth} from '@clerk/express';
import type {RequestHandler} from 'express';
export function clerkSessionAuth(options: Parameters<typeof clerkMiddleware>[0]): RequestHandler {
 const middleware=clerkMiddleware(options);
 return (req,res,next) => middleware(req,res,err => {
  if(err){res.status(401).json({error:'unauthorized'});return;}
  const auth=getAuth(req);
  if(!auth.isAuthenticated || !auth.userId || auth.tokenType !== 'session_token'){res.status(401).json({error:'unauthorized'});return;}
  res.locals.userId=auth.userId;next();
 });
}
