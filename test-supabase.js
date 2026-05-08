
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xwbklksygssrvbyovjsv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Ymtsa3N5Z3NzcnZieW92anN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3ODAxMDcsImV4cCI6MjA5MjM1NjEwN30.2HaFP5_RbGB1kiidpYJ5F1yKyRGp8RqOY_tGq0QY4vc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('surveys').select('id').limit(1);
  if (error) {
    console.error('Connection error:', error);
  } else {
    console.log('Connection successful, data:', data);
  }
}

test();
