const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      role VARCHAR(50) NOT NULL,
      nationality VARCHAR(50) NOT NULL,
      age INTEGER,
      base_price INTEGER NOT NULL,
      current_bid INTEGER NOT NULL,
      current_bidder VARCHAR(100),
      team VARCHAR(100),
      stats JSONB,
      image_url VARCHAR(255),
      status VARCHAR(20) DEFAULT 'available',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bids (
      id SERIAL PRIMARY KEY,
      player_id INTEGER REFERENCES players(id),
      bidder_name VARCHAR(100) NOT NULL,
      team_name VARCHAR(100) NOT NULL,
      amount INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL
    );
  `);

  // Seed some IPL players if none exist
  const { rows } = await pool.query('SELECT COUNT(*) FROM players');
  if (parseInt(rows[0].count) === 0) {
    await pool.query(`
      INSERT INTO players (name, role, nationality, age, base_price, current_bid, team, stats, image_url) VALUES
      ('Virat Kohli', 'Batsman', 'Indian', 35, 20000000, 20000000, null, '{"matches": 237, "runs": 7263, "average": 37.25, "strike_rate": 130.0}', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Virat_Kohli_run_out.jpg/440px-Virat_Kohli_run_out.jpg'),
      ('Rohit Sharma', 'Batsman', 'Indian', 37, 16000000, 16000000, null, '{"matches": 243, "runs": 6211, "average": 29.48, "strike_rate": 130.6}', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/thirty/RohitSharma2019.jpg/440px-RohitSharma2019.jpg'),
      ('Jasprit Bumrah', 'Bowler', 'Indian', 30, 14000000, 14000000, null, '{"matches": 120, "wickets": 145, "economy": 7.4, "average": 23.5}', 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Jasprit_Bumrah.jpg'),
      ('MS Dhoni', 'Wicket-Keeper', 'Indian', 42, 12000000, 12000000, null, '{"matches": 250, "runs": 5082, "average": 39.39, "strike_rate": 135.9}', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/MS_Dhoni_at_Cricket.jpg/440px-MS_Dhoni_at_Cricket.jpg'),
      ('Hardik Pandya', 'All-Rounder', 'Indian', 30, 15000000, 15000000, null, '{"matches": 115, "runs": 2670, "wickets": 54, "strike_rate": 148.2}', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Hardik_Pandya.jpg/440px-Hardik_Pandya.jpg'),
      ('KL Rahul', 'Wicket-Keeper', 'Indian', 32, 14000000, 14000000, null, '{"matches": 132, "runs": 4163, "average": 45.8, "strike_rate": 136.8}', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/KL_Rahul.jpg/440px-KL_Rahul.jpg'),
      ('Ravindra Jadeja', 'All-Rounder', 'Indian', 35, 16000000, 16000000, null, '{"matches": 236, "runs": 2692, "wickets": 132, "economy": 7.6}', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Ravindra_Jadeja.jpg/440px-Ravindra_Jadeja.jpg'),
      ('Pat Cummins', 'Bowler', 'Australian', 30, 18000000, 18000000, null, '{"matches": 83, "wickets": 89, "economy": 8.6, "average": 26.5}', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Pat_Cummins.jpg/440px-Pat_Cummins.jpg'),
      ('Jos Buttler', 'Wicket-Keeper', 'English', 33, 17000000, 17000000, null, '{"matches": 91, "runs": 3582, "average": 44.7, "strike_rate": 149.1}', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Jos_Buttler.jpg/440px-Jos_Buttler.jpg'),
      ('Suryakumar Yadav', 'Batsman', 'Indian', 33, 14000000, 14000000, null, '{"matches": 118, "runs": 3268, "average": 32.0, "strike_rate": 155.4}', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Suryakumar_Yadav.jpg/440px-Suryakumar_Yadav.jpg')
    `);
    console.log('✅ Sample players seeded');
  }

  // Seed admin if not exists
  const bcrypt = require('bcryptjs');
  const adminCheck = await pool.query('SELECT COUNT(*) FROM admins');
  if (parseInt(adminCheck.rows[0].count) === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await pool.query(`INSERT INTO admins (username, password) VALUES ('admin', $1)`, [hash]);
    console.log('✅ Admin seeded: username=admin, password=admin123');
  }

  console.log('✅ Database initialized');
};

module.exports = { pool, initDB };
