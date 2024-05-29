const mysql = require('mysql2/promise');
const {
  invoices,
  customers,
  revenue,
  users,
} = require('../app/lib/placeholder-data');
const bcrypt = require('bcrypt');

const mysqlOptions = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
};

async function createUsersTable(db) {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users(
        id BIGINT NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        
        PRIMARY KEY(id)
      );
    `);
    console.log('Created "users" table');
  } catch (error) {
    console.error('Error creating "users" table:', error);
    throw error;
  }
}

async function createCustomersTable(db) {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS customers(
        id BIGINT NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        image_url VARCHAR(255) NOT NULL,
        
        PRIMARY KEY(id)
      );
    `);
    console.log('Created "customers" table');
  } catch (error) {
    console.error('Error creating "customers" table:', error);
    throw error;
  }
}

async function createInvoicesTable(db) {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS invoices(
        id BIGINT NOT NULL AUTO_INCREMENT,
        customer_id BIGINT NOT NULL,
        amount INT NOT NULL,
        status VARCHAR(255) NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        
        PRIMARY KEY(id),
        CONSTRAINT FK_invoice_TO_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
      );
    `);
    console.log('Created "invoices" table');
  } catch (error) {
    console.error('Error creating "invoices" table:', error);
    throw error;
  }
}

async function createRevenueTable(db) {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS revenue(
        month VARCHAR(4) NOT NULL UNIQUE,
        revenue INT NOT NULL
      );
    `);
    console.log('Created "revenue" table');
  } catch (error) {
    console.error('Error creating "revenue" table:', error);
    throw error;
  }
}

async function backfillUsersTable(db) {
  try {
    const inserted = await Promise.all(
      users.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await db.query(`
          INSERT INTO users (id, name, email, password)
          VALUES (${user.id}, '${user.name}', '${user.email}', '${hashedPassword}');
        `);
      }),
    );
    console.log(`Populated "users" table. Inserted ${inserted.length} users.`);
  } catch (error) {
    console.error('Error populating "users" table:', error);
    throw error;
  }
}

async function backfillCustomersTable(db) {
  try {
    const inserted = await Promise.all(
      customers.map(
        async (customer) =>
          await db.query(`
        INSERT INTO customers (id, name, email, image_url)
        VALUES (${customer.id}, '${customer.name}', '${customer.email}', '${customer.image_url}');
      `),
      ),
    );
    console.log(
      `Populated "customers" table. Inserted ${inserted.length} customers.`,
    );
  } catch (error) {
    console.error('Error populating "customers" table:', error);
    throw error;
  }
}

async function backfillInvoicesTable(db) {
  try {
    const inserted = await Promise.all(
      invoices.map(
        async (invoice) =>
          await db.query(`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${invoice.customer_id}, ${invoice.amount}, '${invoice.status}', '${invoice.date}');
      `),
      ),
    );
    console.log(
      `Populated "invoices" table. Inserted ${inserted.length} invoices.`,
    );
  } catch (error) {
    console.error('Error populating "invoices" table:', error);
    throw error;
  }
}

async function backfillRevenueTable(db) {
  try {
    const inserted = await Promise.all(
      revenue.map(
        async (revenue) =>
          await db.query(`
        INSERT INTO revenue (month, revenue)
        VALUES ('${revenue.month}', ${revenue.revenue});
      `),
      ),
    );
    console.log(
      `Populated "revenue" table. Inserted ${inserted.length} revenues.`,
    );
  } catch (error) {
    console.error('Error populating "revenue" table:', error);
    throw error;
  }
}

async function main() {
  const db = mysql.createPool(mysqlOptions);
  await createUsersTable(db);
  await createCustomersTable(db);
  await createInvoicesTable(db);
  await createRevenueTable(db);
  await backfillUsersTable(db);
  await backfillCustomersTable(db);
  await backfillInvoicesTable(db);
  await backfillRevenueTable(db);
  await db.end();
}

main().catch((error) => {
  console.error(
    'An error occurred while attempting to create and populate database tables:',
    error,
  );
});
