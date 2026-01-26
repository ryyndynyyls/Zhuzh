// Get the IDs of all missing projects active through 2025+
// So we can fetch them from 10kft
const path = require('path');
const assignments = require(path.join(__dirname, '../data/10kft-export/assignments.json'));
const projectMap = require(path.join(__dirname, '../data/10kft-export/project_mapping.json'));
const leaveTypes = require(path.join(__dirname, '../data/10kft-export/leave_types.json'));

const leaveTypeIds = new Set(leaveTypes.map(lt => lt.id));

// Get unmapped that are NOT leave types
const unmappedNonLeave = assignments.filter(a => 
  projectMap[a.assignable_id] === undefined && 
  !leaveTypeIds.has(a.assignable_id)
);

// Get unique project IDs with their stats
const projectStats = new Map();

for (const a of unmappedNonLeave) {
  const id = a.assignable_id;
  if (!projectStats.has(id)) {
    projectStats.set(id, {
      id,
      count: 0,
      assignees: new Set(),
      minDate: a.starts_at,
      maxDate: a.ends_at,
      billRates: new Set()
    });
  }
  const stats = projectStats.get(id);
  stats.count++;
  if (a.assignee) stats.assignees.add(a.assignee);
  if (a.starts_at && a.starts_at < stats.minDate) stats.minDate = a.starts_at;
  if (a.ends_at && a.ends_at > stats.maxDate) stats.maxDate = a.ends_at;
  if (a.bill_rate) stats.billRates.add(a.bill_rate);
}

// Filter to 2025+ active
const active2025Plus = [...projectStats.values()]
  .filter(p => p.maxDate >= '2025-01-01')
  .sort((a, b) => (b.maxDate || '').localeCompare(a.maxDate || ''));

console.log('=== MISSING PROJECT IDs TO FETCH FROM 10KFT ===');
console.log('Copy these IDs to fetch from 10kft API:\n');

const ids = active2025Plus.map(p => p.id);
console.log(ids.join('\n'));

console.log(`\n=== Total: ${ids.length} projects ===`);

// Also output as JSON array for easy copying
console.log('\nAs JSON array:');
console.log(JSON.stringify(ids));
