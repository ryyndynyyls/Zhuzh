import type { App } from '@slack/bolt';
import { supabase } from '../lib/supabase';
import { buildBudgetBlocks, buildAllProjectsBudgetBlocks } from '../blocks';

export function registerBudgetCommand(app: App) {
  app.command('/budget', async ({ command, ack, respond }) => {
    await ack();

    const slackUserId = command.user_id;
    const projectQuery = command.text?.trim();

    // Get user for role check
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('slack_user_id', slackUserId)
      .single();

    if (!projectQuery) {
      // Show all projects summary
      const { data: projects } = await supabase
        .from('project_budget_summary')
        .select('*')
        .order('burn_percentage', { ascending: false })
        .limit(10);

      await respond({
        blocks: buildAllProjectsBudgetBlocks(projects, user?.role || 'employee')
      });
      return;
    }

    // Search for specific project
    const { data: projects } = await supabase
      .from('projects')
      .select('*, client:clients(name), phases:project_phases(*)')
      .ilike('name', `%${projectQuery}%`)
      .limit(5);

    if (!projects || projects.length === 0) {
      await respond({
        text: `❌ No projects found matching "${projectQuery}"`
      });
      return;
    }

    // If multiple matches, show list
    if (projects.length > 1) {
      await respond({
        text: `Found ${projects.length} projects:\n${projects.map(p => `• ${p.name}`).join('\n')}\n\nBe more specific or use the full project name.`
      });
      return;
    }

    // Single match - show detailed budget
    const project = projects[0];
    await respond({
      blocks: buildBudgetBlocks(project, user?.role || 'employee')
    });
  });
}
