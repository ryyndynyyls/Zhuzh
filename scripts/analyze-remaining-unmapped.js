// Deeper analysis of remaining unmapped assignments
const path = require('path');
const assignments = require(path.join(__dirname, '../data/10kft-export/assignments.json'));
const userMap = require(path.join(__dirname, '../data/10kft-export/user_mapping.json'));
const projectMap = require(path.join(__dirname, '../data/10kft-export/project_mapping.json'));
const leaveTypes = require(path.join(__dirname, '../data/10kft-export/leave_types.json'));

const leaveTypeIds = new Set(leaveTypes.map(lt => lt.id));

// Categorize unmapped
let missingUser = 0;
let missingProject = 0;
let missingBoth = 0;
let leaveTypeAssignments = 0;

const missingProjectIds = new Map(); // id -> count
const missingUserIds = new Map(); // id -> count

for (const a of assignments) {
  const hasUser = userMap[a._user_id] !== undefined;
  const hasProject = projectMap[a.assignable_id] !== undefined;
  const isLeaveType = leaveTypeIds.has(a.assignable_id);

  if (isLeaveType) {
    leaveTypeAssignments++;
    continue;
  }

  if (!hasUser && !hasProject) {
    missingBoth++;
    missingProjectIds.set(a.assignable_id, (missingProjectIds.get(a.assignable_id) || 0) + 1);
    missingUserIds.set(a._user_id, (missingUserIds.get(a._user_id) || 0) + 1);
  } else if (!hasUser) {
    missingUser++;
    missingUserIds.set(a._user_id, (missingUserIds.get(a._user_id) || 0) + 1);
  } else if (!hasProject) {
    missingProject++;
    missingProjectIds.set(a.assignable_id, (missingProjectIds.get(a.assignable_id) || 0) + 1);
  }
}

console.log('=== UNMAPPED BREAKDOWN ===\n');
console.log(`Leave type assignments: ${leaveTypeAssignments} (expected, handled via calendar)`);
console.log(`Missing user only: ${missingUser}`);
console.log(`Missing project only: ${missingProject}`);
console.log(`Missing both: ${missingBoth}`);
console.log(`\nTotal unmapped: ${leaveTypeAssignments + missingUser + missingProject + missingBoth}`);

console.log('\n=== MISSING USERS ===');
const sortedUsers = [...missingUserIds.entries()].sort((a, b) => b[1] - a[1]);
for (const [userId, count] of sortedUsers.slice(0, 10)) {
  // Find sample assignment to get email
  const sample = assignments.find(a => a._user_id === userId);
  console.log(`  User ${userId}: ${count} assignments (${sample?.assignee || 'unknown email'})`);
}

console.log('\n=== MISSING PROJECTS (non-leave) ===');
const sortedProjects = [...missingProjectIds.entries()].sort((a, b) => b[1] - a[1]);
console.log(`Unique missing project IDs: ${sortedProjects.length}`);
for (const [projId, count] of sortedProjects.slice(0, 15)) {
  const sample = assignments.find(a => a.assignable_id === projId);
  console.log(`  Project ${projId}: ${count} assignments`);
  if (sample) {
    console.log(`    Sample: ${sample.assignee}, ${sample.starts_at} to ${sample.ends_at}`);
  }
}

// Check date ranges of missing project assignments
console.log('\n=== DATE RANGES OF MISSING PROJECT ASSIGNMENTS ===');
const missingByYear = new Map();
for (const a of assignments) {
  if (projectMap[a.assignable_id] === undefined && !leaveTypeIds.has(a.assignable_id)) {
    if (a.starts_at) {
      const year = a.starts_at.substring(0, 4);
      missingByYear.set(year, (missingByYear.get(year) || 0) + 1);
    }
  }
}
console.log([...missingByYear.entries()].sort());
