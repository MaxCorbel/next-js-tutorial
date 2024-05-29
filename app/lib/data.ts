import { sql } from '@vercel/postgres';
import { unstable_noStore as noStore } from 'next/cache';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  User,
  Revenue,
  LatestInvoice,
  Count,
  StatusCount,
} from './definitions';
import { formatCurrency, randomTimeout } from './utils';
import dotenv from 'dotenv';
import mysql, { PoolOptions } from 'mysql2/promise';

dotenv.config();

const mysqlOptions: PoolOptions = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
};

export const db = mysql.createPool({
  ...mysqlOptions,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
  idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export async function fetchRevenue() {
  noStore();
  await randomTimeout(1000, 3000);
  const [revenue] = await db.query<Revenue[]>(`SELECT * FROM revenue;`);
  return revenue;
}

export async function fetchLatestInvoices() {
  noStore();
  await randomTimeout(1000, 3000);
  const [latestInvoicesRaw] = await db.query<LatestInvoiceRaw[]>(`
    SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    ORDER BY invoices.date DESC
    LIMIT 5;
  `);
  const latestInvoices = latestInvoicesRaw.map(
    (invoice) =>
      ({
        ...invoice,
        amount: formatCurrency(invoice.amount),
      }) as LatestInvoice,
  );
  return latestInvoices;
}

export async function fetchCardData() {
  noStore();
  await randomTimeout(1000, 3000);
  const [invoiceCount, customerCount, invoiceStatusCount] = await Promise.all([
    db.query<Count[]>(`SELECT COUNT(*) AS "count" FROM invoices`),
    db.query<Count[]>(`SELECT COUNT(*) AS "count" FROM customers`),
    db.query<StatusCount[]>(`SELECT
    SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
    SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
    FROM invoices`),
  ]);
  return {
    numberOfInvoices: invoiceCount[0][0].count,
    numberOfCustomers: customerCount[0][0].count,
    totalPaidInvoices: formatCurrency(invoiceStatusCount[0][0].paid),
    totalPendingInvoices: formatCurrency(invoiceStatusCount[0][0].pending),
  };
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const [invoices] = await db.query<InvoicesTable[]>(`
    SELECT
      invoices.id,
      invoices.amount,
      invoices.date,
      invoices.status,
      customers.name,
      customers.email,
      customers.image_url
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name LIKE '%${query}%' OR
      customers.email LIKE '%${query}%' OR
      invoices.amount LIKE '%${query}%' OR
      invoices.date LIKE '%${query}%' OR
      invoices.status LIKE '%${query}%'
    ORDER BY invoices.date DESC
    LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
`);
  return invoices;
}

export async function fetchInvoicesPages(query: string) {
  const [count] = await db.query<Count[]>(`
    SELECT COUNT(*) AS "count"
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name LIKE '%${query}%' OR
      customers.email LIKE '%${query}%' OR
      invoices.amount LIKE '%${query}%' OR
      invoices.date LIKE '%${query}%' OR
      invoices.status LIKE '%${query}%'
  `);
  const totalPages = Math.ceil(Number(count[0].count) / ITEMS_PER_PAGE);
  return totalPages;
}

export async function fetchInvoiceById(id: string) {
  const [invoiceRaw] = await db.query<InvoiceForm[]>(`
    SELECT
      invoices.id,
      invoices.customer_id,
      invoices.amount,
      invoices.status
    FROM invoices
    WHERE invoices.id = ${id};
  `);
  const invoice = invoiceRaw.map((invoice) => ({
    ...invoice,
    amount: invoice.amount / 100,
  }));
  return invoice[0];
}

export async function fetchCustomers() {
  const [customers] = await db.query<CustomerField[]>(`
    SELECT
      id,
      name
    FROM customers
    ORDER BY name ASC
  `);
  return customers;
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await sql<CustomersTableType>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}

export async function getUser(email: string) {
  try {
    const user = await sql`SELECT * FROM users WHERE email=${email}`;
    return user.rows[0] as User;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}
