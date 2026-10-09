import {writeFile} from 'node:fs/promises';
import {z} from 'zod';
import {BackupSchema} from '../src/backup.js';
import {EvidenceCorpusSchema} from '../src/evidence.js';
const schema=z.toJSONSchema(BackupSchema,{target:'draft-2020-12'});
await writeFile(new URL('../schemas/backup-v1.schema.json',import.meta.url),JSON.stringify({...schema,title:'Petal backup v1',description:'Structural interchange schema. Also run parseBackup for calendar, uncertainty, product applicability and referential integrity validation.'},null,2)+'\n');
await writeFile(new URL('../schemas/evidence.schema.json',import.meta.url),JSON.stringify(z.toJSONSchema(EvidenceCorpusSchema,{target:'draft-2020-12'}),null,2)+'\n');
