const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xwbklksygssrvbyovjsv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Ymtsa3N5Z3NzcnZieW92anN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3ODAxMDcsImV4cCI6MjA5MjM1NjEwN30.2HaFP5_RbGB1kiidpYJ5F1yKyRGp8RqOY_tGq0QY4vc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing auth login...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'klhetvintellez23@gmail.com',
    password: '123456'
  });
  
  if (authError) {
    console.error('Login error:', authError);
    return;
  }
  console.log('Login successful, user id:', authData.user.id);
  
  console.log('Attempting to create survey...');
  const { data, error } = await supabase
    .from('encuestas')
    .insert({
      usuario_id: authData.user.id,
      titulo: 'Test Survey',
      descripcion: 'Testing 409 conflict',
      estado: 'borrador'
    })
    .select()
    .single();
    
  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Insert successful:', data);
  }
}

test();
