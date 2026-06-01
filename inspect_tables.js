const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const tables = [
  'tbl_combate',
  'tbl_rondas',
  'tbl_turnos',
  'tbl_practica',
  'tbl_usuario',
  'tbl_cancion',
  'tbl_genero_musical',
  'tbl_genero_musical_x_cancion',
  'tbl_nivel'
];

async function run() {
  const schema = {};
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      schema[t] = { error: error.message };
    } else {
      if (data.length > 0) {
        schema[t] = { columns: Object.keys(data[0]) };
      } else {
        schema[t] = { columns: "No data in table to infer schema" };
      }
    }
  }
  console.log(JSON.stringify(schema, null, 2));
}

run();
