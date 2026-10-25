import { DEMO_MODE } from './config.js';
import { demoApi } from './demoApi.js';
import { serverApi } from './serverApi.js';

// One API for the whole app: our database functions on Supabase, or the in-browser demo backend.
export const api = DEMO_MODE ? demoApi : serverApi;
