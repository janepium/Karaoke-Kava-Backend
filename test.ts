import { ComunidadService } from './src/services/comunidad.service';
async function test() {
  const s = new ComunidadService();
  try {
    const feed = await s.getFeed();
    console.log('feed', feed);
  } catch(e) { console.error(e); }
}
test();
