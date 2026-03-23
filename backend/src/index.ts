import 'dotenv/config';
import express from 'express';
import router from './routes';

const app = express();
const PORT = process.env.PORT_BACKEND ?? 3001;

app.use(express.json());
app.use('/api', router);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

export default app;
