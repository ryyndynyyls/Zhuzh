// Deeper analysis of what these missing assignable_ids actually are
const path = require('path');
const assignments = require(path.join(__dirname, '../data/10kft-export/assignments.json'));
const projectMap = require(path.join(__dirname, '../data/10kft-export/project_mapping.json'));

// Get all assignments with missing project mapping
const unmapped = assignments.filter(a => projectMap[a.assignable_id] === undefined);

console.log('Total unmapped assignments:', unmapped.length);

// Check all fields on a sample to understand structure
console.log('\n--- Sample unmapped assignment (full object) ---');
console.log(JSON.stringify(unmapped[0], null, 2));

// Group by assignable_type if it exists
const byType = new Map();
for (const a of unmapped) {
  const type = a.assignable_type || a.type || 'unknown';
  if (!byType.has(type)) byType.set(type, []);
  byType.get(type).push(a);
}

console.log('\n--- Grouped by type ---');
for (const [type, items] of byType) {
  console.log(`${type}: ${items.length} assignments`);
  // Show first item's relevant fields
  const sample = items[0];
  console.log(`  Sample: assignable_id=${sample.assignable_id}, starts_at=${sample.starts_at}`);
}

// Check if these IDs might be in a leave_types export
const fs = require('fs');
const leaveTypesPath = path.join(__dirname, '../data/10kft-export/leave_types.json');
if (fs.existsSync(leaveTypesPath)) {
  const leaveTypes = require(leaveTypesPath);
  console.log('\n--- Leave Types ---');
  console.log(leaveTypes);
  
  // Check if any unmapped IDs match leave type IDs
  const leaveTypeIds = new Set(leaveTypes.map(lt => lt.id));
  const unmappedThatAreLeave = unmapped.filter(a => leaveTypeIds.has(a.assignable_id));
  console.log(`\nUnmapped that are leave types: ${unmappedThatAreLeave.length}`);
}
