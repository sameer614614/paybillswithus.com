import express from 'express';
import type { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { env } from './config/env.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', routes);
  configureStaticApps(app);
  app.use(errorHandler);

  return app;
}

function configureStaticApps(app: Express) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const projectRoot = path.resolve(__dirname, '..', '..');

  const apps = [
    { mountPath: '/admin', directory: path.resolve(projectRoot, 'admin', 'dist') },
    { mountPath: '/agent', directory: path.resolve(projectRoot, 'agent', 'dist') },
  ];

  apps.forEach(({ mountPath, directory }) => {
    if (!fs.existsSync(directory)) {
      return;
    }

    app.use(mountPath, express.static(directory, { index: 'index.html' }));
    app.get(`${mountPath}/*`, (req, res, next) => {
      const indexFile = path.join(directory, 'index.html');
      fs.access(indexFile, fs.constants.R_OK, (error) => {
        if (error) {
          next();
          return;
        }
        res.sendFile(indexFile);
      });
    });
  });
}
