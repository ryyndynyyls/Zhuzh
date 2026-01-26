// Find out what these 257 missing projects are
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

// Get unique project IDs with their assignment counts and date ranges
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

// Sort by most recent activity
const sortedProjects = [...projectStats.values()]
  .sort((a, b) => (b.maxDate || '').localeCompare(a.maxDate || ''));

console.log('=== TOP 20 MISSING PROJECTS (by most recent activity) ===\n');

for (const p of sortedProjects.slice(0, 20)) {
  console.log(`Project ID: ${p.id}`);
  console.log(`  Assignments: ${p.count}`);
  console.log(`  Date range: ${p.minDate} to ${p.maxDate}`);
  console.log(`  Assignees: ${[...p.assignees].join(', ')}`);
  console.log(`  Bill rates: ${[...p.billRates].join(', ')}`);
  console.log('');
}

// Count by how recent they are
const recent2025Plus = sortedProjects.filter(p => p.maxDate >= '2025-01-01');
const recent2024Plus = sortedProjects.filter(p => p.maxDate >= '2024-01-01');

console.log('=== SUMMARY ===');
console.log(`Total missing projects: ${sortedProjects.length}`);
console.log(`Active through 2024+: ${recent2024Plus.length}`);
console.log(`Active through 2025+: ${recent2025Plus.length}`);
