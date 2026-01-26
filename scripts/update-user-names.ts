/**
 * Update UA5 User Names and Disciplines
 * 
 * Run: npx tsx scripts/update-user-names.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Full UA5 team roster
const UA5_TEAM = [
  { name: 'Michelle Hodge', discipline: 'ProStrat' },
  { name: 'Maleno Braun', discipline: 'ProStrat' },
  { name: 'Kara Grossman', discipline: 'ProStrat' },
  { name: 'Levi Brooks', discipline: 'ProStrat' },
  { name: 'Ryan Daniels', discipline: 'ProStrat' },
  { name: 'Sam Kilgus', discipline: 'Developer' },
  { name: 'Jep Alaba', discipline: 'Developer' },
  { name: 'Jason Farrell', discipline: 'Developer' },
  { name: 'Bret Morris', discipline: 'Developer' },
  { name: 'Ryan Gordon', discipline: 'Developer' },
  { name: 'Cornelius Hairston', discipline: 'Developer' },
  { name: 'Cindy Tong', discipline: 'Developer' },
  { name: 'Mikaela Prydz', discipline: 'Developer' },
  { name: 'Jen Hail', discipline: 'Developer' },
  { name: 'Boro Vukovic', discipline: 'Developer' },
  { name: 'Jin Kim', discipline: 'Developer' },
  { name: 'Andrew McQuiston', discipline: 'Designer' },
  { name: 'Troy Kreiner', discipline: 'Designer' },
  { name: 'Kathryn Fabrizio', discipline: 'Designer' },
  { name: 'Jacob Goodman', discipline: 'Designer' },
  { name: 'Hunter Walls', discipline: 'Designer' },
  { name: 'Frédéric Demers', discipline: 'Designer' },
  { name: 'Patrick Dubé', discipline: 'Designer' },
];

// Build lookup maps for flexible matching
const FIRST_NAME_MAP = new Map<string, { fullName: string; discipline: string }>();
const FULL_NAME_MAP = new Map<string, { fullName: string; discipline: string }>();

for (const person of UA5_TEAM) {
  const firstName = person.name.split(' ')[0].toLowerCase();
  const fullNameKey = person.name.toLowerCase();
  
  FIRST_NAME_MAP.set(firstName, { fullName: person.name, discipline: person.discipline });
  FULL_NAME_MAP.set(fullNameKey, { fullName: person.name, discipline: person.discipline });
}

async function updateUserNames() {
  console.log('🔄 Updating UA5 user names and disciplines...\n');
  
  const orgId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  
  // Get all users
  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, discipline')
    .eq('org_id', orgId);
  
  if (error || !users) {
    console.error('Failed to fetch users:', error);
    return;
  }
  
  console.log(`Found ${users.length} users in database\n`);
  
  let updated = 0;
  let notFound = 0;
  
  for (const user of users) {
    const currentFirstName = user.name.split(' ')[0].toLowerCase();
    const currentFullName = user.name.toLowerCase();
    
    // Try to match by full name first, then first name
    let match = FULL_NAME_MAP.get(currentFullName) || FIRST_NAME_MAP.get(currentFirstName);
    
    if (match) {
      // Check if update needed
      const needsNameUpdate = user.name !== match.fullName;
      const needsDisciplineUpdate = user.discipline !== match.discipline;
      
      if (needsNameUpdate || needsDisciplineUpdate) {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            name: match.fullName,
            discipline: match.discipline
          })
          .eq('id', user.id);
        
        if (updateError) {
          console.error(`  ❌ Failed to update ${user.name}:`, updateError.message);
        } else {
          console.log(`  ✅ ${user.name} → ${match.fullName} (${match.discipline})`);
          updated++;
        }
      } else {
        console.log(`  ⏭️  ${user.name} already correct`);
      }
    } else {
      console.log(`  ⚠️  No match found for: ${user.name}`);
      notFound++;
    }
  }
  
  console.log(`\n✅ Updated: ${updated}`);
  console.log(`⚠️  Not matched: ${notFound}`);
  
  // Also export the name map for use in calendar-sync
  console.log('\n📝 Name lookup map for calendar-sync.ts:');
  console.log('const UA5_NAME_MAP = new Map([');
  for (const [firstName, data] of FIRST_NAME_MAP) {
    console.log(`  ['${firstName}', '${data.fullName}'],`);
  }
  console.log(']);');
}

updateUserNames().catch(console.error);
