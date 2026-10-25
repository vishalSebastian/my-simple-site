import { DEMO_MODE } from './config.js';
import { demoApi } from './demoApi.js';
import { supabaseApi } from './supabaseApi.js';

// One API for the whole app: real Supabase, or the in-browser demo backend.
export const api = DEMO_MODE ? demoApi : supabaseApi;
