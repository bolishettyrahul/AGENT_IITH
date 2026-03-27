const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function saveSignal(data) {
  const { error } = await supabase.from('signals').insert(data);
  if (error) console.error('[Supabase] Insert error:', error.message);
}

module.exports = { supabase, saveSignal };
