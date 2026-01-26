// Run this in the browser console while logged into 10kft
// Fetches the 45 missing projects by ID

const missingIds = [10915836,10933366,11068247,11017714,11017712,11068357,11017713,11068358,11068359,11031325,10989292,3272122,7122665,8121682,7903696,9694437,6655802,6188941,6724040,11159032,11010015,10992563,10492149,6071887,2623487,9671432,10829058,9513884,10829057,2839599,10612584,7880099,9713698,9756153,8978895,10277697,7843360,5784337,10383421,9038773,2632471,9756152,10230653,9713699,7645901];

const results = [];
const notFound = [];

for (const id of missingIds) {
  try {
    const response = await fetch(`/api/v1/projects/${id}`, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const project = await response.json();
      results.push(project);
      console.log(`✅ ${id}: ${project.name}`);
    } else {
      notFound.push(id);
      console.log(`❌ ${id}: Not found (${response.status})`);
    }
  } catch (err) {
    notFound.push(id);
    console.log(`❌ ${id}: Error - ${err.message}`);
  }
  
  // Small delay to avoid rate limiting
  await new Promise(r => setTimeout(r, 100));
}

console.log(`\n=== RESULTS ===`);
console.log(`Found: ${results.length}`);
console.log(`Not found: ${notFound.length}`);

// Download results
if (results.length > 0) {
  const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'missing_projects.json';
  a.click();
  console.log('📥 Downloaded missing_projects.json');
}

// Log not found IDs
if (notFound.length > 0) {
  console.log('\nNot found IDs:', notFound);
}
