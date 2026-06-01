const dotenv = require('dotenv');
dotenv.config();

async function run() {
  const url = `${process.env.SUPABASE_URL}/rest/v1/?apikey=${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/openapi+json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    const data = await res.json();
    
    if (data.message) {
      console.log("Error from API:", data);
      return;
    }
    
    const targetTables = ['tbl_combate', 'tbl_rondas', 'tbl_turnos'];
    const schemas = {};
    
    // Check if it's OpenAPI 3.0 or Swagger 2.0
    const definitions = data.definitions || (data.components && data.components.schemas) || {};
    
    for (const table of targetTables) {
      if (definitions[table]) {
        schemas[table] = definitions[table].properties;
      } else {
        schemas[table] = "Not found in OpenAPI schema";
      }
    }
    
    console.log("Keys of data:", Object.keys(data));
    console.log(JSON.stringify(schemas, null, 2));
  } catch(e) {
    console.error('Error fetching schema:', e.message);
  }
}
run();
