const axios = require('axios');

async function run() {
  try {
    const res = await axios.get('http://localhost:3000/api/canciones');
    console.log('Canciones:', res.data);
  } catch(e) {
    console.log('Error:', e.response?.data || e.message);
  }
}
run();
