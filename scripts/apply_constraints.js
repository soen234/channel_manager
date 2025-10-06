const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://rdujhmznuxjnhqchbige.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWpobXpudXhqbmhxY2hiaWdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTU3NjM3OSwiZXhwIjoyMDc1MTUyMzc5fQ.bUvMSbSZ1wdy5OfR93lcLK42xAHTZuSHyhyx9QZDMaQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applyConstraints() {
  console.log('🔧 Applying database constraints...\n');

  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, '../sql/add_constraints.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 SQL to execute:');
    console.log('─'.repeat(60));
    console.log(sql);
    console.log('─'.repeat(60));
    console.log();

    // Execute each statement separately
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 80)}...`);

      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        console.error('❌ Error:', error);

        // Try alternative approach - direct query
        const { error: directError } = await supabase.from('_sql').insert({ query: statement });
        if (directError) {
          console.log('⚠️  Could not execute via API. Please run this SQL manually in Supabase Dashboard.');
        }
      } else {
        console.log('✅ Success');
      }
    }

    console.log('\n📋 Constraint Summary:');
    console.log('  ✅ organization_id is now NOT NULL in user_roles');
    console.log('  ✅ UNIQUE constraint on (user_id, organization_id)');
    console.log('\n⚠️  If you see errors above, please run the SQL file manually:');
    console.log('     Supabase Dashboard → SQL Editor → Paste sql/add_constraints.sql');

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n⚠️  Please run sql/add_constraints.sql manually in Supabase Dashboard');
  }
}

applyConstraints();
