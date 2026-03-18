import { Pool } from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import url from 'url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    const check = await pool.query(`
      SELECT 1 FROM information_schema.columns
       WHERE table_name = 'messages' AND column_name = 'image_url'
    `)
    if (check.rowCount > 0) {
      console.log('Column messages.image_url already exists')
      return
    }
    await pool.query(`ALTER TABLE messages ADD COLUMN image_url TEXT`)
    console.log('Added messages.image_url')
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
