import { syncDatabase } from '../models';
import dotenv from 'dotenv';

dotenv.config();

const runMigrations = async () => {
  try {
    console.log('Running database migrations...');

    // Sync all models with database
    await syncDatabase(false);

    console.log('Migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigrations();
