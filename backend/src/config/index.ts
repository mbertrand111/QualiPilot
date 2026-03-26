import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// .env est à la racine du monorepo, pas dans backend/
dotenvConfig({ path: resolve(__dirname, '../../../.env') });

export const config = {
  port:         Number(process.env.PORT_BACKEND ?? 3001),
  databasePath: process.env.DATABASE_PATH ?? './qualipilot.db',
  ado: {
    pat:     process.env.ADO_PAT     ?? '',
    org:     process.env.ADO_ORG     ?? '',
    project: process.env.ADO_PROJECT ?? '',
    baseUrl: process.env.ADO_BASE_URL ?? 'https://dev.azure.com',
  },
} as const;
