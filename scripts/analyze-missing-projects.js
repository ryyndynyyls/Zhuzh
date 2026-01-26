// Analyze the ~6K non-leave-type unmapped assignments
const path = require('path');
const assignments = require(path.join(__dirname, '../data/10kft-export/assignments.json'));
const projectMap = require(path.join(__dirname, '../data/10kft-export/project_mapping.json'));
const leaveTypes = require(path.join(__dirname, '../data/10kft-export/leave_types.json'));
const projects = require(path.join(__dirname, '../data/10kft-export/projects.json'));

const leaveTypeIds = new Set(leaveTypes.map(lt => lt.id));

// Get unmapped that are NOT leave types
const unmappedNonLeave = assignments.filter(a => 
  projectMap[a.assignable_id] === undefined && 
  !leaveTypeIds.has(a.assignable_id)
);

console.log('Unmapped non-leave assignments:', unmappedNonLeave.length);

// Get unique project IDs
const uniqueProjectIds = new Set(unmappedNonLeave.map(a => a.assignable_id));
console.log('Unique missing project IDs:', uniqueProjectIds.size);

// Check date ranges - are these old?
const years = new Map();
for (const a of unmappedNonLeave) {
  if (a.starts_at) {
    const year = a.starts_at.substring(0, 4);
    years.set(year, (years.get(year) || 0) + 1);
  }
}
console.log('\nBy year:');
console.log([...years.entries()].sort());

// Check if any of these project IDs exist in projects.json but weren't mapped
const projectsById = new Map(projects.map(p => [p.id, p]));
let foundInProjects = 0;
let notFoundInProjects = 0;
const sampleNotFound = [];

for (const id of uniqueProjectIds) {
  if (projectsById.has(id)) {
    foundInProjects++;
    console.log(`\nFOUND in projects.json but not mapped: ${id}`);
    console.log(projectsById.get(id).name);
  } else {
    notFoundInProjects++;
    if (sampleNotFound.length < 5) {
      sampleNotFound.push(id);
    }
  }
}

console.log(`\nIn projects.json but not mapped: ${foundInProjects}`);
console.log(`Not in projects.json at all: ${notFoundInProjects}`);

// For the ones not in projects.json, what info do we have from assignments?
console.log('\nSample assignments for missing projects:');
for (const id of sampleNotFound) {
  const sample = unmappedNonLeave.find(a => a.assignable_id === id);
  console.log(`  ID ${id}:`);
  console.log(`    assignee: ${sample.assignee}`);
  console.log(`    dates: ${sample.starts_at} to ${sample.ends_at}`);
  console.log(`    bill_rate: ${sample.bill_rate}`);
}

// Check most recent unmapped - are they recent or old?
const recentUnmapped = unmappedNonLeave
  .filter(a => a.starts_at && a.starts_at >= '2024-01-01')
  .sort((a, b) => b.starts_at.localeCompare(a.starts_at));

console.log(`\nUnmapped from 2024+: ${recentUnmapped.length}`);
if (recentUnmapped.length > 0) {
  console.log('Most recent unmapped:');
  for (const a of recentUnmapped.slice(0, 5)) {
    console.log(`  ${a.starts_at}: assignable_id=${a.assignable_id}, assignee=${a.assignee}`);
  }
}
