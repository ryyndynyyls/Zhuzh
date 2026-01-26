-- ============================================
-- 009: User Job Titles & Specialty Notes
-- Run in Supabase SQL Editor AFTER 008_bullpen_fields.sql
-- ============================================

-- ============================================
-- CLEANUP: Remove non-existent users
-- ============================================

DELETE FROM users WHERE email ILIKE '%alex@useallfive%';
DELETE FROM users WHERE email ILIKE '%jordan@useallfive%';

-- ============================================
-- LEADERSHIP
-- ============================================

UPDATE users SET 
  job_title = 'CEO / Co-Founder',
  role = 'admin',
  location = 'Los Angeles',
  specialty_notes = 'Executive leadership. Often in the trenches vetting technology or design ideas, problem solving. Does his own version of strategy. Can take tasks off Ryan Daniels plate. Does not do copywriting.'
WHERE name ILIKE '%Levi Brooks%';

UPDATE users SET 
  job_title = 'CTO / Co-Founder',
  role = 'admin',
  location = 'Los Angeles',
  specialty_notes = 'Full-stack developer. Can do everything - frontend, backend, creative/technical. One of our strongest all-around developers.'
WHERE name ILIKE '%Jason Farrell%';

UPDATE users SET 
  job_title = 'Director of Technology',
  role = 'admin',
  location = 'Los Angeles',
  specialty_notes = 'Full-stack developer. Can do everything. Especially strong at creative/narrative applications of code - experiential, storytelling through technology.'
WHERE name ILIKE '%Bret Morris%';

UPDATE users SET 
  job_title = 'Managing Director',
  role = 'admin',
  location = 'Los Angeles',
  specialty_notes = 'Budgeting, resourcing, timelines, process. Most senior producer - pushes back on big clients about budgets and process. Handles new business work. Training Maleno and Kara to reach her level.'
WHERE name ILIKE '%Michelle Hodge%';

-- Kate = Kathryn Fabrizio (Creative Director)
UPDATE users SET 
  job_title = 'Creative Director',
  role = 'admin',
  location = 'Philadelphia',
  alt_name = 'Kate',
  specialty_notes = 'Design team leader. Our "fixer" - can do anything: Figma, animations, light vibecoding, digital design, print design. Best at interfacing with clients. Occasionally overlaps with Ryan Daniels on experiential/narrative projects. Handles new business pitches when design-heavy.'
WHERE name ILIKE '%Kathryn Fabrizio%';

UPDATE users SET 
  job_title = 'Director of Strategy & Copy',
  role = 'admin',
  location = 'Philadelphia',
  specialty_notes = 'Fixer across storytelling, conceptual/narrative, brand/business strategy, copywriting. Anything required to sell a client/user on the value of an experience. Only shares tasks with Levi. Handles new business work.'
WHERE name ILIKE '%Ryan Daniels%';

-- Troy Kreiner (Design Director) - LA, catching up in digital after branding
UPDATE users SET 
  job_title = 'Design Director',
  role = 'employee',
  location = 'Los Angeles',
  specialty_notes = 'Catching up in digital design after years in branding. Good for content websites but NOT for experiential or creative technology projects. Does not work on Google Cloud Next yet.'
WHERE name ILIKE '%Troy Kreiner%';

-- ============================================
-- DEVELOPMENT TEAM
-- ============================================

UPDATE users SET 
  job_title = 'Software Engineer',
  role = 'employee',
  location = 'Baltimore',
  specialty_notes = 'Mainly backend and software development. Not primarily frontend. Strong on architecture and systems.'
WHERE name ILIKE '%Cornelius Hairston%';

UPDATE users SET 
  job_title = 'Lead Developer',
  role = 'employee',
  location = 'San Diego',
  specialty_notes = 'Mainly frontend developer. Not backend-focused.'
WHERE name ILIKE '%Ryan Gordon%';

UPDATE users SET 
  job_title = 'Sr. Developer',
  role = 'employee',
  location = 'Houston',
  specialty_notes = 'Amazing all-around developer. Mainly frontend but highly versatile. One of our strongest developers.'
WHERE name ILIKE '%Cindy Tong%';

UPDATE users SET 
  job_title = 'Developer',
  role = 'employee',
  location = 'Toronto',
  specialty_notes = 'Great with hardware. Can do some backend in addition to frontend. Good for physical/experiential installations.'
WHERE name ILIKE '%Boro Vukovic%';

UPDATE users SET 
  job_title = 'Lead Developer',
  role = 'employee',
  location = 'Philadelphia',
  specialty_notes = 'Totally frontend. No backend.'
WHERE name ILIKE '%Jep Alaba%';

-- Jenn = Jen Hail (Sr. Developer)
UPDATE users SET 
  job_title = 'Sr. Developer',
  role = 'employee',
  location = 'Detroit',
  alt_name = 'Jenn',
  specialty_notes = 'Totally frontend. No backend.'
WHERE name ILIKE '%Jen Hail%';

UPDATE users SET 
  job_title = 'Developer',
  role = 'employee',
  location = 'New York',
  specialty_notes = 'Mainly frontend developer.'
WHERE name ILIKE '%Sam Kilgus%';

UPDATE users SET 
  job_title = 'Developer',
  role = 'employee',
  location = 'Toronto',
  is_freelance = TRUE,
  specialty_notes = 'FREELANCE. Only tap for light maintenance work. Not for major projects.'
WHERE name ILIKE '%Mikaela Prydz%';

-- Jin Kim - Freelance front-end developer
UPDATE users SET 
  job_title = 'Developer',
  role = 'employee',
  is_freelance = TRUE,
  specialty_notes = 'FREELANCE. Front-end developer.'
WHERE name ILIKE '%Jin Kim%';

-- ============================================
-- DESIGN TEAM
-- ============================================

UPDATE users SET 
  job_title = 'Associate Art Director',
  role = 'employee',
  location = 'Philadelphia',
  specialty_notes = 'Expert designer - digital, print, animations, design systems. Very precise, thinks critically through UX. One rung below Kate. Can be trusted with complex conceptual work.'
WHERE name ILIKE '%Andrew McQuiston%';

UPDATE users SET 
  job_title = 'Sr. Designer',
  role = 'employee',
  location = 'New York',
  specialty_notes = 'Digital designer. Can do illustrations and light animations. Takes on lighter, less conceptually demanding work. Still learning the polish element.'
WHERE name ILIKE '%Jacob Goodman%';

UPDATE users SET 
  job_title = 'Sr. Designer',
  role = 'employee',
  location = 'Los Angeles',
  specialty_notes = 'Reports to Troy. Specializes in content sites, internal projects, branding. Does NOT work on Google Cloud Next or experiential projects yet.'
WHERE name ILIKE '%Hunter Walls%';

-- ============================================
-- PRODUCTION TEAM
-- ============================================

UPDATE users SET 
  job_title = 'Production Coordinator',
  role = 'pm',
  location = 'Dallas',
  specialty_notes = 'Budgeting, resourcing, timelines. Still building confidence - Michelle is training him to push back on clients more.'
WHERE name ILIKE '%Maleno%';

UPDATE users SET 
  job_title = 'Sr. Producer',
  role = 'pm',
  location = 'Los Angeles',
  specialty_notes = 'Budgeting, resourcing, timelines. Still building confidence - Michelle is training her to push back on clients more.'
WHERE name ILIKE '%Kara Grossman%';

-- ============================================
-- FREELANCERS (Cloud Next specialists)
-- ============================================

-- Fred = Frederic Demers (Sr. Art Director, Freelance)
UPDATE users SET 
  job_title = 'Sr. Art Director',
  role = 'employee',
  location = 'Montreal',
  is_freelance = TRUE,
  alt_name = 'Fred',
  specialty_notes = 'FREELANCE. Brought in for Cloud Next each year. Operates at Andrew-level. Senior Art Director type.'
WHERE name ILIKE '%Frederic Demers%' OR name ILIKE '%Frédéric Demers%';

UPDATE users SET 
  job_title = 'Sr. Art Director',
  role = 'employee',
  location = 'Montreal',
  is_freelance = TRUE,
  specialty_notes = 'FREELANCE. Brought in for Cloud Next each year. Operates at Andrew-level. Senior Art Director type.'
WHERE name ILIKE '%Patrick Dube%' OR name ILIKE '%Patrick Dubé%';

-- ============================================
-- VERIFICATION
-- ============================================

SELECT name, alt_name, job_title, role, location, is_freelance, 
       LEFT(specialty_notes, 50) as notes_preview
FROM users 
WHERE is_active = true 
ORDER BY job_title, name;
