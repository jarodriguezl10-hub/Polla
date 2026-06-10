const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n');
const url = env.find(l => l.includes('NEXT_PUBLIC_SUPABASE_URL')).split('=')[1].replace(/\"/g, '').trim();
const key = env.find(l => l.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')).split('=')[1].replace(/\"/g, '').trim();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function deleteUserAndPredictions(email) {
  console.log(`Buscando al usuario con correo: ${email}`);

  // 1. Buscar el usuario
  const { data: users, error: findError } = await supabase
    .from('users')
    .select('id, email, name')
    .eq('email', email);

  if (findError) {
    console.error("Error buscando el usuario:", findError);
    return;
  }

  if (!users || users.length === 0) {
    console.log(`No se encontró ningún usuario con el correo: ${email}`);
    return;
  }

  const user = users[0];
  console.log(`✅ Usuario encontrado: ${user.name} (ID: ${user.id})`);

  // 2. Eliminar predicciones asociadas a este usuario
  console.log("Eliminando predicciones asociadas...");
  const { data: deletedPreds, error: predError } = await supabase
    .from('predictions')
    .delete()
    .eq('user_id', user.id)
    .select();

  if (predError) {
    console.error("❌ Error eliminando predicciones:", predError);
    return;
  }
  console.log(`✅ Se eliminaron ${deletedPreds ? deletedPreds.length : 0} predicciones de este usuario.`);

  // 3. Eliminar al usuario de la tabla users
  console.log("Eliminando registro del usuario...");
  const { error: userError } = await supabase
    .from('users')
    .delete()
    .eq('id', user.id);

  if (userError) {
    console.error("❌ Error eliminando al usuario:", userError);
    return;
  }
  
  console.log(`✅ El usuario ${user.name} (${email}) ha sido eliminado completamente de la base de datos.`);
}

deleteUserAndPredictions('beimarpereira@gmail.com');
