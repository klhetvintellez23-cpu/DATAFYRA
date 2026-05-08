const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xwbklksygssrvbyovjsv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Ymtsa3N5Z3NzcnZieW92anN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3ODAxMDcsImV4cCI6MjA5MjM1NjEwN30.2HaFP5_RbGB1kiidpYJ5F1yKyRGp8RqOY_tGq0QY4vc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixProfile() {
  console.log('Testing auth login...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'klhetvintellez23@gmail.com',
    password: '123456'
  });
  
  if (authError) {
    console.error('Login error:', authError);
    return;
  }
  
  const userId = authData.user.id;
  console.log('Login successful, user id:', userId);
  
  console.log('Checking profile...');
  const { data: profile, error: profError } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (profError) {
    console.log('Profile not found, creating it...');
    const { data: newProfile, error: createError } = await supabase
      .from('perfiles')
      .insert({
        id: userId,
        email: 'klhetvintellez23@gmail.com',
        nombre_completo: 'Test User'
      })
      .select()
      .single();
      
    if (createError) {
       console.error('Failed to create profile:', createError);
       return;
    }
    console.log('Profile created:', newProfile);
  } else {
    console.log('Profile exists:', profile);
  }
  
  console.log('Attempting to create survey...');
  const { data, error } = await supabase
    .from('encuestas')
    .insert({
      usuario_id: userId,
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

fixProfile();
