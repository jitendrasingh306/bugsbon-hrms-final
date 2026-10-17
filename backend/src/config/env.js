import dotenv from 'dotenv';
dotenv.config();

const required = ['MONGODB_URI', 'JWT_SECRET'];

export function checkEnv() {
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    console.error('Copy backend/.env.example to backend/.env and fill in the values.');
    process.exit(1);
  }
  if (process.env.JWT_SECRET.length < 32) {
    console.error('JWT_SECRET must be at least 32 characters long.');
    process.exit(1);
  }
}

export const env = {
  get mongoUri() { return process.env.MONGODB_URI; },
  get jwtSecret() { return process.env.JWT_SECRET; },
  get jwtExpiresIn() { return process.env.JWT_EXPIRES_IN || '8h'; },
  get port() { return Number(process.env.PORT) || 5000; },
  get clientOrigin() { return process.env.CLIENT_ORIGIN || 'http://localhost:5173'; },
};
