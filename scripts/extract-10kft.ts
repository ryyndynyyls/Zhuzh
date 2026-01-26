/**
 * 10,000ft / Resource Management Data Extraction Script
 * 
 * Uses session cookies (stolen from browser) to extract data.
 * Run once, get everything, cancel SmartSheet forever.
 * 
 * Usage:
 *   npx tsx scripts/extract-10kft.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// CONFIGURATION
// ============================================

// Session cookies from browser Network tab
const SESSION_COOKIES = 'tenkft-x=TKFS0108fd4255c89b98debc3e37369cfcad6c87958ac7d5a9f26434272dc778cd; tenkft-y=TKFS0108fd4255c89b98debc3e37369cfcad6c87958ac7d5a9f26434272dc778cd';

const API_BASE = 'https://rm.smartsheet.com/api/v1';
const OUTPUT_DIR = path.join(__dirname, '../data/10kft-export');

// ============================================
// API CLIENT
// ============================================

async function apiGet(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`${API_BASE}${endpoint}`);
  
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  
  console.log(`  → GET ${endpoint}`);
  
  const response = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      'Cookie': SESSION_COOKIES,
    },
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API Error ${response.status}: ${text}`);
  }
  
  return response.json();
}

/**
 * Fetch all pages of a paginated endpoint
 */
async function fetchAllPages(endpoint: string, params: Record<string, string> = {}): Promise<any[]> {
  const allData: any[] = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const result = await apiGet(endpoint, { ...params, page: String(page), per_page: '100' });
    
    if (result.data && Array.isArray(result.data)) {
      allData.push(...result.data);
      
      // Check if there are more pages
      hasMore = result.paging?.next !== null;
      page++;
      
      // Rate limiting - be nice to the API
      await sleep(100);
    } else {
      hasMore = false;
    }
  }
  
  return allData;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// DATA EXTRACTION FUNCTIONS
// ============================================

async function extractUsers(): Promise<any[]> {
  console.log('\n📥 Extracting Users...');
  const users = await fetchAllPages('/users');
  console.log(`   Found ${users.length} users`);
  return users;
}

async function extractProjects(): Promise<any[]> {
  console.log('\n📥 Extracting Projects...');
  // Get all projects regardless of state
  const projects = await fetchAllPages('/projects', { with_archived: 'true' });
  console.log(`   Found ${projects.length} projects`);
  return projects;
}

async function extractPhases(projects: any[]): Promise<any[]> {
  console.log('\n📥 Extracting Phases...');
  const allPhases: any[] = [];
  
  let count = 0;
  for (const project of projects) {
    try {
      const phases = await fetchAllPages(`/projects/${project.id}/phases`);
      // Add project reference to each phase
      phases.forEach(p => p._project_id = project.id);
      allPhases.push(...phases);
      count++;
      if (count % 10 === 0) {
        console.log(`   Processed ${count}/${projects.length} projects...`);
      }
    } catch (err) {
      // Some projects may not have phases
    }
    await sleep(50);
  }
  
  console.log(`   Found ${allPhases.length} phases`);
  return allPhases;
}

async function extractAssignments(users: any[]): Promise<any[]> {
  console.log('\n📥 Extracting Assignments...');
  const allAssignments: any[] = [];
  
  for (const user of users) {
    if (user.archived) continue;
    
    try {
      const assignments = await fetchAllPages(`/users/${user.id}/assignments`);
      // Add user reference to each assignment
      assignments.forEach(a => a._user_id = user.id);
      allAssignments.push(...assignments);
      
      if (assignments.length > 0) {
        console.log(`   ${user.first_name} ${user.last_name}: ${assignments.length} assignments`);
      }
    } catch (err) {
      console.log(`   ⚠️ Could not fetch assignments for ${user.first_name} ${user.last_name}`);
    }
    await sleep(50);
  }
  
  console.log(`   Found ${allAssignments.length} total assignments`);
  return allAssignments;
}

async function extractTimeEntries(users: any[]): Promise<any[]> {
  console.log('\n📥 Extracting Time Entries (this may take a while)...');
  const allTimeEntries: any[] = [];
  
  // Get time entries for the last 2 years
  const startDate = '2024-01-01';
  const endDate = new Date().toISOString().split('T')[0];
  
  for (const user of users) {
    if (user.archived) continue;
    
    try {
      const entries = await fetchAllPages(`/users/${user.id}/time_entries`, {
        from: startDate,
        to: endDate,
      });
      // Add user reference to each entry
      entries.forEach(e => e._user_id = user.id);
      allTimeEntries.push(...entries);
      
      if (entries.length > 0) {
        console.log(`   ${user.first_name} ${user.last_name}: ${entries.length} entries`);
      }
    } catch (err) {
      console.log(`   ⚠️ Could not fetch time entries for ${user.first_name} ${user.last_name}`);
    }
    await sleep(50);
  }
  
  console.log(`   Found ${allTimeEntries.length} total time entries`);
  return allTimeEntries;
}

async function extractLeaveTypes(): Promise<any[]> {
  console.log('\n📥 Extracting Leave Types...');
  try {
    const leaveTypes = await fetchAllPages('/leave_types');
    console.log(`   Found ${leaveTypes.length} leave types`);
    return leaveTypes;
  } catch (err) {
    console.log('   ⚠️ Leave types endpoint not available');
    return [];
  }
}

async function extractHolidays(): Promise<any[]> {
  console.log('\n📥 Extracting Holidays...');
  try {
    const holidays = await fetchAllPages('/holidays');
    console.log(`   Found ${holidays.length} holidays`);
    return holidays;
  } catch (err) {
    console.log('   ⚠️ Holidays endpoint not available');
    return [];
  }
}

// ============================================
// FILE OUTPUT
// ============================================

function saveToFile(filename: string, data: any): void {
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`   💾 Saved to ${filename} (${data.length} records)`);
}

function generateSummary(data: {
  users: any[];
  projects: any[];
  phases: any[];
  assignments: any[];
  timeEntries: any[];
  leaveTypes: any[];
  holidays: any[];
}): string {
  const activeUsers = data.users.filter(u => !u.archived);
  
  const summary = `
# 10,000ft Data Export Summary
Generated: ${new Date().toISOString()}

## Record Counts
- Users: ${data.users.length} (${activeUsers.length} active)
- Projects: ${data.projects.length}
- Phases: ${data.phases.length}
- Assignments: ${data.assignments.length}
- Time Entries: ${data.timeEntries.length}
- Leave Types: ${data.leaveTypes.length}
- Holidays: ${data.holidays.length}

## Active Users
${activeUsers.map(u => `- ${u.first_name} ${u.last_name} (${u.role || 'No role'}) - ${u.email}`).join('\n')}

## Projects (first 30)
${data.projects.slice(0, 30).map(p => `- ${p.name} (${p.client || 'no client'})`).join('\n')}
${data.projects.length > 30 ? `... and ${data.projects.length - 30} more` : ''}

## Next Steps
1. Review the extracted data in the JSON files
2. Run the import script: npx tsx scripts/import-to-resourceflow.ts
3. Verify data in ResourceFlow
4. Cancel SmartSheet! 🎉
`;
  
  return summary;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  10,000ft Data Extraction Tool');
  console.log('  Using session cookies (the sneaky way)');
  console.log('═══════════════════════════════════════════════════');
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  console.log(`\n📂 Output directory: ${OUTPUT_DIR}`);
  
  // Test API connection
  console.log('\n🔌 Testing API connection...');
  try {
    const testResult = await apiGet('/users', { per_page: '1' });
    console.log('   ✅ API connection successful!');
  } catch (err: any) {
    console.error('   ❌ API connection failed:', err.message);
    console.error('\n   Session cookies may have expired. Get fresh ones from browser.');
    process.exit(1);
  }
  
  // Extract all data
  const users = await extractUsers();
  saveToFile('users.json', users);
  
  const projects = await extractProjects();
  saveToFile('projects.json', projects);
  
  const phases = await extractPhases(projects);
  saveToFile('phases.json', phases);
  
  const assignments = await extractAssignments(users);
  saveToFile('assignments.json', assignments);
  
  const timeEntries = await extractTimeEntries(users);
  saveToFile('time_entries.json', timeEntries);
  
  const leaveTypes = await extractLeaveTypes();
  saveToFile('leave_types.json', leaveTypes);
  
  const holidays = await extractHolidays();
  saveToFile('holidays.json', holidays);
  
  // Generate and save summary
  const summary = generateSummary({
    users,
    projects,
    phases,
    assignments,
    timeEntries,
    leaveTypes,
    holidays,
  });
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'SUMMARY.md'), summary);
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  ✅ EXTRACTION COMPLETE!');
  console.log('═══════════════════════════════════════════════════');
  console.log(summary);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
