import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import bcrypt from 'bcryptjs';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

const DB_PATH = path.join(__dirname, 'data.sqlite');
let db;

async function initDB(){
  db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await db.exec(schema);
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@paytotake.com';
  const adminPass  = process.env.ADMIN_PASSWORD || 'ChangeMe!2025';
  const row = await db.get('SELECT id FROM users WHERE email = ?', adminEmail);
  if(!row){
    const hash = bcrypt.hashSync(adminPass, 10);
    await db.run('INSERT INTO users (email, password_hash, role, must_change_password) VALUES (?, ?, ?, ?)', adminEmail, hash, 'admin', 1);
    console.log('Seeded admin:', adminEmail);
  }
}
export function getDB(){ return db; }
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));
app.get('/', (req,res)=> res.redirect('/admin/login.html'));

import authRoutes from './src/routes/auth.js';
import userRoutes from './src/routes/users.js';
import domainRoutes from './src/routes/domains.js';
import bulkRoutes from './src/routes/bulk.js';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/bulk', bulkRoutes);

const PORT = process.env.PORT || 8080;
initDB().then(()=>{
  app.listen(PORT, ()=> console.log(`PAYTOTAKE Admin running on http://localhost:${PORT}`));
});