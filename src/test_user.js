const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('tbl_usuario').select('*').limit(3);
  console.log('tbl_usuario sample:', JSON.stringify(data, null, 2));
  console.log('error:', error);
}

run();
