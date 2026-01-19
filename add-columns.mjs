import postgres from 'postgres';

const sql = postgres("postgresql://postgres:cRdEdCXUAiToErLyTLDtRTSkufIIJRIv@nozomi.proxy.rlwy.net:33523/railway");

async function run() {
  try {
    console.log('Adding new columns to wallet_performance...');
    
    await sql`ALTER TABLE wallet_performance ADD COLUMN IF NOT EXISTS user_name TEXT`;
    console.log('✅ Added user_name');
    
    await sql`ALTER TABLE wallet_performance ADD COLUMN IF NOT EXISTS x_username TEXT`;
    console.log('✅ Added x_username');
    
    await sql`ALTER TABLE wallet_performance ADD COLUMN IF NOT EXISTS profile_image TEXT`;
    console.log('✅ Added profile_image');
    
    await sql`ALTER TABLE wallet_performance ADD COLUMN IF NOT EXISTS verified_badge BOOLEAN DEFAULT false`;
    console.log('✅ Added verified_badge');
    
    console.log('\n✅ All columns added successfully!');
    await sql.end();
  } catch(e) {
    console.error('Error:', e.message);
    await sql.end();
  }
}

run();
