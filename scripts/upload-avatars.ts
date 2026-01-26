/**
 * Bulk Avatar Upload Script
 * 
 * Matches headshots in brand/avatar-headshots/ to users by name
 * and uploads them to Supabase Storage.
 * 
 * Usage: npx tsx scripts/upload-avatars.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.log('\nMake sure you have SUPABASE_SERVICE_ROLE_KEY set (not the anon key)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Directory containing headshots
const HEADSHOTS_DIR = path.join(__dirname, '..', 'brand', 'avatar-headshots');

// Name mapping: filename pattern -> user name patterns to match
// The script will try to fuzzy match, but you can add explicit mappings here
const EXPLICIT_MAPPINGS: Record<string, string> = {
  'ryan-daniels': 'Ryan Daniels',
  'levi-brooks': 'Levi Brooks',
  'michelle': 'Michelle',
  'kara': 'Kara',
  'mikaela': 'Mikaela',
  'cindy': 'Cindy',
  'bret': 'Bret',
  'cornelius': 'Cornelius',
  'troy': 'Troy',
  'kate': 'Kate',
  'jason': 'Jason',
};

interface User {
  id: string;
  name: string;
  avatar_url: string | null;
}

/**
 * Extract name hint from filename
 * e.g., "68eecd30-..._ryan-daniels.avif" -> "ryan-daniels"
 */
function extractNameFromFilename(filename: string): string | null {
  // Remove extension
  const withoutExt = filename.replace(/\.(avif|jpg|jpeg|png|webp)$/i, '');
  
  // Try to extract name part after underscore (UUID_name format)
  const parts = withoutExt.split('_');
  if (parts.length > 1) {
    // Get everything after the first underscore
    return parts.slice(1).join('_').toLowerCase().replace(/[+]/g, ' ').trim();
  }
  
  // If no underscore, the whole thing might be the name
  return withoutExt.toLowerCase();
}

/**
 * Normalize name for comparison
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
    .trim();
}

/**
 * Try to match a filename to a user
 */
function findMatchingUser(filename: string, users: User[]): User | null {
  const nameHint = extractNameFromFilename(filename);
  if (!nameHint) return null;

  console.log(`  Filename hint: "${nameHint}"`);

  // Check explicit mappings first
  for (const [pattern, userName] of Object.entries(EXPLICIT_MAPPINGS)) {
    if (nameHint.includes(pattern.toLowerCase())) {
      const user = users.find(u => 
        normalizeName(u.name).includes(normalizeName(userName)) ||
        normalizeName(userName).includes(normalizeName(u.name))
      );
      if (user) {
        console.log(`  ✓ Explicit match: "${pattern}" -> "${user.name}"`);
        return user;
      }
    }
  }

  // Try fuzzy matching
  const normalizedHint = normalizeName(nameHint);
  
  for (const user of users) {
    const normalizedUserName = normalizeName(user.name);
    const nameParts = user.name.toLowerCase().split(' ');
    
    // Check if hint contains user's full normalized name
    if (normalizedHint.includes(normalizedUserName)) {
      console.log(`  ✓ Full name match: "${user.name}"`);
      return user;
    }
    
    // Check if user's normalized name contains hint
    if (normalizedUserName.includes(normalizedHint) && normalizedHint.length > 3) {
      console.log(`  ✓ Partial match: "${user.name}"`);
      return user;
    }
    
    // Check individual name parts
    for (const part of nameParts) {
      if (part.length > 3 && normalizedHint.includes(normalizeName(part))) {
        console.log(`  ✓ Name part match: "${part}" in "${user.name}"`);
        return user;
      }
    }
  }

  return null;
}

/**
 * Get MIME type from extension
 */
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
  };
  return mimeTypes[ext] || 'image/jpeg';
}

async function main() {
  console.log('🖼️  Avatar Upload Script\n');
  console.log(`Looking for headshots in: ${HEADSHOTS_DIR}\n`);

  // Check if directory exists
  if (!fs.existsSync(HEADSHOTS_DIR)) {
    console.error(`❌ Directory not found: ${HEADSHOTS_DIR}`);
    process.exit(1);
  }

  // Get all image files
  const files = fs.readdirSync(HEADSHOTS_DIR).filter(f => 
    /\.(avif|jpg|jpeg|png|webp)$/i.test(f)
  );
  
  console.log(`Found ${files.length} image files\n`);

  // Fetch all users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, avatar_url')
    .eq('is_active', true);

  if (usersError) {
    console.error('❌ Failed to fetch users:', usersError.message);
    process.exit(1);
  }

  console.log(`Found ${users?.length || 0} active users\n`);
  console.log('Users:', users?.map(u => u.name).join(', '), '\n');

  // Track results
  const results = {
    matched: [] as string[],
    uploaded: [] as string[],
    skipped: [] as string[],
    errors: [] as string[],
    noMatch: [] as string[],
  };

  // Process each file
  for (const filename of files) {
    console.log(`\n📄 Processing: ${filename}`);
    
    const user = findMatchingUser(filename, users || []);
    
    if (!user) {
      console.log(`  ⚠️ No matching user found`);
      results.noMatch.push(filename);
      continue;
    }

    results.matched.push(`${filename} -> ${user.name}`);

    // Check if user already has an avatar
    if (user.avatar_url) {
      console.log(`  ⏭️ User already has avatar, skipping`);
      results.skipped.push(user.name);
      continue;
    }

    // Read file
    const filePath = path.join(HEADSHOTS_DIR, filename);
    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = getMimeType(filename);
    const ext = path.extname(filename);
    
    // Generate storage path
    const storagePath = `avatars/${user.id}${ext}`;

    console.log(`  📤 Uploading to: ${storagePath}`);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.log(`  ❌ Upload failed: ${uploadError.message}`);
      results.errors.push(`${user.name}: ${uploadError.message}`);
      continue;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(storagePath);

    const avatarUrl = urlData.publicUrl;
    console.log(`  🔗 URL: ${avatarUrl}`);

    // Update user record
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id);

    if (updateError) {
      console.log(`  ❌ DB update failed: ${updateError.message}`);
      results.errors.push(`${user.name}: ${updateError.message}`);
      continue;
    }

    console.log(`  ✅ Success!`);
    results.uploaded.push(user.name);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary\n');
  console.log(`✅ Uploaded: ${results.uploaded.length}`);
  results.uploaded.forEach(name => console.log(`   - ${name}`));
  
  console.log(`\n⏭️ Skipped (already have avatar): ${results.skipped.length}`);
  results.skipped.forEach(name => console.log(`   - ${name}`));
  
  console.log(`\n⚠️ No match found: ${results.noMatch.length}`);
  results.noMatch.forEach(file => console.log(`   - ${file}`));
  
  if (results.errors.length > 0) {
    console.log(`\n❌ Errors: ${results.errors.length}`);
    results.errors.forEach(err => console.log(`   - ${err}`));
  }

  console.log('\n✨ Done!\n');
}

main().catch(console.error);
