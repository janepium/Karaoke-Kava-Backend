const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  console.log('Testing connection...');
  
  // 1. Inspect tbl_usuario
  const { data: users, error: errUser } = await supabase.from('tbl_usuario').select('*').limit(1);
  if (errUser) {
    console.error('Error fetching tbl_usuario:', errUser);
  } else {
    console.log('tbl_usuario row:', users);
  }

  // 2. Suspected tables
  const tables = [
    'tbl_nivel', 
    'tbl_rango', 
    'tbl_usuario_nivel', 
    'tbl_experiencia', 
    'tbl_perfil', 
    'tbl_puntaje',
    'tbl_historial',
    'tbl_progreso'
  ];
  
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (!error) {
      console.log(`Table ${t} exists! row:`, data);
    } else {
      // Table doesn't exist or query failed
    }
  }
}

inspect();
