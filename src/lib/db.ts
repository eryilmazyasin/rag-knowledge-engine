import { Pool } from "pg";

// [ÖĞRENME NOTU: Connection Pool]
// Her API isteğinde yeni bir veritabanı bağlantısı açıp kapatmak maliyetlidir.
// Pool, hazır bağlantıları açık tutarak sorguların çok daha hızlı çalışmasını sağlar.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export default pool;
