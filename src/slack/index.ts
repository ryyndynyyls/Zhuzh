/**
 * Entry point for Slack app
 * Loads environment variables BEFORE importing anything else
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Now import the actual app (after env is loaded)
import('./app.js');
