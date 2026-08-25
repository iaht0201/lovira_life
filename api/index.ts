import dotenv from 'dotenv';
dotenv.config();

import { createApp } from '../src/serverApp.js';

const app = createApp();

export default app;
