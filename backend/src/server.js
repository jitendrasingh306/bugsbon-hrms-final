import { checkEnv, env } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';

checkEnv();
await connectDB();
createApp().listen(env.port, () => console.log(`API running on http://localhost:${env.port}`));
