const postgres = require('postgres');

const sql = postgres('postgresql://postgres:cRdEdCXUAiToErLyTLDtRTSkufIIJRIv@nozomi.proxy.rlwy.net:33523/railway', {
  connect_timeout: 60,
  idle_timeout: 30,
  max_lifetime: 60 * 30
});

async function fixSchema() {
  try {
    console.log('Testing connection...');
    const testResult = await sql`SELECT 1 as test`;
    console.log('Connected successfully!');

    // Fix wallet_performance table - add missing columns and constraints
    console.log('\n1. Fixing wallet_performance table...');
    
    // Add wallet_address column (the sync uses this, not "address")
    await sql`ALTER TABLE wallet_performance ADD COLUMN IF NOT EXISTS wallet_address TEXT`;
    await sql`ALTER TABLE wallet_performance ADD COLUMN IF NOT EXISTS roi_percent NUMERIC(10, 2)`;
    
    // Make wallet_address unique for upserts
    console.log('\n2. Creating unique constraint on wallet_address...');
    try {
      await sql`ALTER TABLE wallet_performance ADD CONSTRAINT wp_wallet_address_unique UNIQUE (wallet_address)`;
    } catch (e) {
      console.log('Constraint may already exist, continuing...');
    }
    
    // Create enum types if they don't exist
    console.log('\n3. Creating enum types...');
    try {
      await sql`CREATE TYPE trader_tier AS ENUM ('elite', 'strong', 'moderate', 'developing', 'limited')`;
    } catch (e) {
      console.log('trader_tier enum may already exist');
    }
    
    try {
      await sql`CREATE TYPE risk_profile AS ENUM ('conservative', 'moderate', 'aggressive')`;
    } catch (e) {
      console.log('risk_profile enum may already exist');
    }

    console.log('\n✅ Schema fixes applied!');
    
    // Verify columns
    const columns = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'wallet_performance'
    `;
    console.log('\nwallet_performance columns:', columns.map(c => c.column_name).join(', '));

  } catch (error) {
    console.error('Fix failed:', error.message);
    console.error(error);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

fixSchema();
