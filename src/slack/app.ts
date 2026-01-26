/**
 * Zhuzh Slack Bolt App Configuration
 * Main entry point for the Slack application
 */

import { App, LogLevel } from '@slack/bolt';
import { registerWeekCommand } from './commands/week';
import { registerPendingCommand } from './commands/pending';
import { registerBudgetCommand } from './commands/budget';
import { registerDMTestCommand } from './commands/dmTest';
import { registerAddTimeCommand } from './commands/addTime';
import {
  registerStartTimerCommand,
  registerStopTimerCommand,
  registerLogTimeCommand,
  registerTimeStatusCommand,
} from './commands/timer';
import { registerTimerViewSubmissions, registerTimerActions } from './handlers/timerHandlers';
import { registerViewSubmissions } from './handlers/viewSubmissions';
import { registerActions } from './handlers/actions';
import { registerDisambiguationActions } from './handlers/disambiguationActions';
import { registerConversationalHandler } from './handlers/conversational';
import { registerScheduledJobs } from './scheduled';

// Initialize the Bolt app with Socket Mode for real-time events
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  logLevel: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
});

// Register slash commands
registerWeekCommand(app);
registerPendingCommand(app);
registerBudgetCommand(app);
registerDMTestCommand(app);
registerAddTimeCommand(app);

// Timer commands
registerStartTimerCommand(app);
registerStopTimerCommand(app);
registerLogTimeCommand(app);
registerTimeStatusCommand(app);

// Register scheduled job info
registerScheduledJobs(app);

// Register handlers
registerViewSubmissions(app);
registerActions(app);
registerDisambiguationActions(app);
registerConversationalHandler(app);

// Timer handlers
registerTimerViewSubmissions(app);
registerTimerActions(app);

// Error handler for unhandled errors
app.error(async (error) => {
  console.error('Slack app error:', error);
});

// Start the app
(async () => {
  const port = process.env.PORT || 3001;
  await app.start(port);
  console.log('⚡ Zhuzh Slack app is running on port', port);
})();

export default app;
