import express from 'express';
import cors from 'cors';
import { join } from 'node:path';
import { PORT } from './config.js';
import { optionalAuth } from './auth.js';
import { one } from './db.js';
import { auth } from './routes/auth.js';
import { campaigns } from './routes/campaigns.js';
import { contributions } from './routes/contributions.js';
import { admin } from './routes/admin.js';
import { community } from './routes/community.js';
import { startScheduler } from './scheduler.js';
import { seed } from './seed.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' }));
app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
app.use(optionalAuth);

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use(auth);
app.use(campaigns);
app.use(contributions);
app.use(community);
app.use(admin);

app.use('/admin-ui', express.static(join(process.cwd(), 'admin-ui')));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side' });
});

if (!one('SELECT 1 FROM users LIMIT 1')) seed();
startScheduler();
app.listen(PORT, '0.0.0.0', () => console.log(`API listening on http://0.0.0.0:${PORT}`));
