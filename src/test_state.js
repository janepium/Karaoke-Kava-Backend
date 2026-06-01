const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // Check all prácticas and their puntaje_final column name
  const { data: practicas, error: e1 } = await supabase
    .from('tbl_practica')
    .select('*')
    .limit(5);
  console.log('Prácticas columns sample:', JSON.stringify(practicas?.[0] || {}, null, 2));
  console.log('Error:', e1);

  // Check user id=2 (the active Google login user)
  const { data: user, error: e2 } = await supabase
    .from('tbl_usuario')
    .select('id, nombre, id_nivel, id_rol, auth_uid')
    .eq('id', 2);
  console.log('\nUser #2:', JSON.stringify(user, null, 2));

  // Check leaderboard query - what does eq id_rol=1 return?
  const { data: jugadores, error: e3 } = await supabase
    .from('tbl_usuario')
    .select('id, nombre, id_nivel, id_rol')
    .eq('id_rol', 1);
  console.log('\nAll jugadores (id_rol=1):', JSON.stringify(jugadores, null, 2));

  // Check if there are ANY prácticas saved with puntaje
  const { data: practicasConPuntaje, error: e4 } = await supabase
    .from('tbl_practica')
    .select('*');
  console.log('\nAll prácticas:', JSON.stringify(practicasConPuntaje, null, 2));
  console.log('Error:', e4);
}

run();
