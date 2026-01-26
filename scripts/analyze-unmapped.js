// Quick analysis of unmapped assignments
const path = require('path');
const assignments = require(path.join(__dirname, '../data/10kft-export/assignments.json'));
const userMap = require(path.join(__dirname, '../data/10kft-export/user_mapping.json'));
const projectMap = require(path.join(__dirname, '../data/10kft-export/project_mapping.json'));

const missingUsers = new Map();
const missingProjects = new Map();

for (const a of assignments) {
  if (userMap[a._user_id] === undefined) {
    const count = missingUsers.get(a._user_id) || 0;
    missingUsers.set(a._user_id, count + 1);
  }
  if (projectMap[a.assignable_id] === undefined) {
    const count = missingProjects.get(a.assignable_id) || 0;
    missingProjects.set(a.assignable_id, count + 1);
  }
}

console.log('Missing Users:', missingUsers.size, 'unique');
console.log([...missingUsers.entries()].sort((a,b) => b[1]-a[1]).slice(0,10));

console.log('\nMissing Projects:', missingProjects.size, 'unique');
console.log([...missingProjects.entries()].sort((a,b) => b[1]-a[1]).slice(0,10));

// Check what types these missing "projects" are
console.log('\nSample missing assignable_ids:');
const missingIds = [...missingProjects.keys()].slice(0, 5);
for (const id of missingIds) {
  const sample = assignments.find(a => a.assignable_id === id);
  console.log(`  ${id}: type=${sample?.assignable_type}, name=${sample?.assignable_name || 'unknown'}`);
}
