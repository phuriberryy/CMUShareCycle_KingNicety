import fs from 'fs'
import path from 'path'
import url from 'url'
import { Pool } from 'pg'
import dotenv from 'dotenv'

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const sqlPath = path.resolve(__dirname, '..', 'sql', 'migrate_item_image_gallery.sql')
const sql = fs.readFileSync(sqlPath, 'utf-8')

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined')
  }

  const pool = new Pool({ connectionString: databaseUrl })
  try {
    console.log('🔄 Running item image gallery migration...')
    await pool.query(sql)
    console.log('✅ Migration completed: items.image_urls (JSONB gallery, max 3 on app)')
  } catch (err) {
    console.error('❌ Migration failed:', err.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
