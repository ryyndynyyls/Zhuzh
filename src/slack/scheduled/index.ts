import { App } from '@slack/bolt';
import { sendFridayConfirmationDMs, sendFridayDMToUser } from './fridayDM';
import { sendMondaySchedulingDMs, sendMondayDMToUser } from './mondayDM';
import { sendFridayReminderDMs } from './fridayReminder';
import { sendBudgetAlerts, checkProjectBudget } from './budgetAlerts';

export {
  sendFridayConfirmationDMs,
  sendFridayDMToUser,
  sendMondaySchedulingDMs,
  sendMondayDMToUser,
  sendFridayReminderDMs,
  sendBudgetAlerts,
  checkProjectBudget
};

/**
 * Register scheduled jobs
 * 
 * With smart timing, the scheduler runs more frequently but only sends
 * to users whose optimal send time matches the current time.
 * 
 * Schedule these to run at all possible send times:
 * - Monday DM: 9am Mon, Tue, Wed, Thu (cascades based on PTO)
 * - Friday DM: 3pm Wed, Thu, Fri (cascades based on PTO/Friday Off)
 */
export function registerScheduledJobs(app: App) {
  console.log('📅 Scheduled jobs registered (with smart timing):');
  console.log('');
  console.log('  Monday "Week Ahead" DM:');
  console.log('    - Run at 9am Mon, Tue, Wed, Thu');
  console.log('    - Smart timing adjusts per-user based on PTO');
  console.log('');
  console.log('  Friday "Confirm Week" DM:');
  console.log('    - Run at 3pm Wed, Thu, Fri');
  console.log('    - Smart timing adjusts for PTO and Friday Off group');
  console.log('');
  console.log('  Friday Reminder DM:');
  console.log('    - Run at 5pm for users who haven\'t submitted');
  console.log('');

  console.log('  Budget Alerts:');
  console.log('    - Run daily at 9am');
  console.log('    - Alerts at 75% (warning) and 90% (critical)');
  console.log('');

  // Example using node-cron (uncomment in production):
  // import cron from 'node-cron';
  //
  // Monday previews - run 9am Mon-Thu to catch PTO adjustments
  // cron.schedule('0 9 * * 1', () => sendMondaySchedulingDMs(app));  // Monday
  // cron.schedule('0 9 * * 2', () => sendMondaySchedulingDMs(app));  // Tuesday
  // cron.schedule('0 9 * * 3', () => sendMondaySchedulingDMs(app));  // Wednesday
  // cron.schedule('0 9 * * 4', () => sendMondaySchedulingDMs(app));  // Thursday
  //
  // Friday confirmations - run 3pm Wed-Fri to catch PTO adjustments
  // cron.schedule('0 15 * * 3', () => sendFridayConfirmationDMs(app)); // Wednesday
  // cron.schedule('0 15 * * 4', () => sendFridayConfirmationDMs(app)); // Thursday
  // cron.schedule('0 15 * * 5', () => sendFridayConfirmationDMs(app)); // Friday
  //
  // Reminder - only Friday
  // cron.schedule('0 17 * * 5', () => sendFridayReminderDMs(app));
  //
  // Budget alerts - daily at 9am
  // cron.schedule('0 9 * * *', () => sendBudgetAlerts(app));
}
