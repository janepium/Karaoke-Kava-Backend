const axios = require('axios');

async function run() {
  try {
    const leader = await axios.get('http://localhost:3000/api/comunidad/leaderboard');
    console.log('Leaderboard:', leader.data);

    // Replace with actual integer ID if needed, but we simulate what frontend sends (auth_uid)
    const perfil = await axios.get('http://localhost:3000/api/comunidad/perfil/fee00beb-e415-4e22-841f-f631016df40f').catch(e => e.response?.data);
    console.log('Perfil:', perfil);
  } catch(e) {
    console.error('Global Error:', e.message);
  }
}
run();
