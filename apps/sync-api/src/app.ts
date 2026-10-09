import express, { type RequestHandler, type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { validateEnvelope } from '@petal/encrypted-sync';
import { SnapshotStore } from './store.js';
export function createApp(config: { store: SnapshotStore; authenticate: RequestHandler; allowedOrigins: string[] }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({origin:config.allowedOrigins,methods:['GET','PUT','DELETE'],allowedHeaders:['Authorization','Content-Type','If-Match'],exposedHeaders:['ETag'],credentials:false}));
  app.get('/health',(_req,res) => res.json({ok:true}));
  // Cookies and client-supplied owner IDs are never used for authorization.
  app.use('/v1', (req,res,next) => {
    if (!/^Bearer \S+$/.test(req.headers.authorization ?? '')) { res.status(401).json({error:'unauthorized'}); return; }
    if (req.headers.origin && !config.allowedOrigins.includes(req.headers.origin)) {res.status(403).json({error:'origin_not_allowed'});return;}
    next();
  }, rateLimit({windowMs:60_000,limit:60,standardHeaders:'draft-8',legacyHeaders:false}), config.authenticate);
  app.use('/v1', (req,res,next) => {
    if (!res.locals.userId || typeof res.locals.userId !== 'string') {res.status(401).json({error:'unauthorized'});return;}
    res.set('Cache-Control','no-store');
    next();
  });
  app.use('/v1',express.json({limit:'3mb',strict:true}));
  app.get('/v1/snapshot',async (_req,res) => {
    const result = await config.store.read(res.locals.userId);
    res.set('ETag',`"${result.revision}"`).json(result);
  });
  const mutate: RequestHandler = async (req,res) => {
    const match = /^"(0|[1-9]\d*)"$/.exec(req.headers['if-match'] ?? '');
    const expected = match ? Number(match[1]):NaN;
    if (!Number.isSafeInteger(expected) || expected < 0 || expected >= Number.MAX_SAFE_INTEGER) {res.status(428).json({error:'revision_required'});return;}
    let envelope = null;
    if (req.method === 'PUT') {
      if (!req.is('application/json')) {res.status(415).json({error:'json_required'});return;}
      try {envelope = validateEnvelope(req.body);} catch {res.status(400).json({error:'invalid_encrypted_envelope'});return;}
    }
    const result = await config.store.write(res.locals.userId,expected,envelope);
    if (!result) {const current = await config.store.read(res.locals.userId);res.status(409).json({error:'revision_conflict',revision:current.revision});return;}
    res.set('ETag',`"${result.revision}"`).json(result);
  };
  app.put('/v1/snapshot',mutate);
  app.delete('/v1/snapshot',mutate);
  app.use((_req,res) => res.status(404).json({error:'not_found'}));
  const errorHandler: ErrorRequestHandler = (err,_req,res,_next) => {
    // Never log tokens, payloads, libSQL errors or health records.
    const status = err?.status === 413 ? 413 : err?.status === 400 ? 400 : 503;
    res.status(status).json({error:status === 413 ? 'payload_too_large': status === 400 ? 'invalid_json':'sync_unavailable'});
  };
  app.use(errorHandler);
  return app;
}
