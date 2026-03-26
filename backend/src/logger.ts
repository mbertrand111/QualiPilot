import pino from 'pino';
import { join } from 'path';

const isTest = process.env.NODE_ENV === 'test';

const logger = isTest
  ? pino({ level: 'silent' })
  : pino(
      { level: 'info' },
      pino.multistream([
        { stream: process.stdout },
        {
          stream: pino.destination({
            dest: join(process.cwd(), 'qualipilot.log'),
            append: true,
            sync: false,
          }),
        },
      ]),
    );

export default logger;
