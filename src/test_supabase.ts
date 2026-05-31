import { supabase } from './config/supabase';

async function test() {
  try {
    const { data: roles, error } = await supabase
      .from('tbl_rol')
      .select('*');

    if (error) {
      console.error('Error fetching tbl_rol:', error);
    } else {
      console.log('ALL ROLES IN DATABASE:');
      console.log(JSON.stringify(roles, null, 2));
    }

  } catch (err) {
    console.error('Catch error:', err);
  }
}

test();
