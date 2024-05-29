// This file contains type definitions for your data.
// It describes the shape of the data, and what data type each property should accept.
// For simplicity of teaching, we're manually defining these types.

import { RowDataPacket } from 'mysql2';

// However, these types are generated automatically if you're using an ORM such as Prisma.
export interface User extends RowDataPacket {
  id: string;
  name: string;
  email: string;
  password: string;
}

export type Customer = {
  id: string;
  name: string;
  email: string;
  image_url: string;
};

export interface Invoice extends RowDataPacket {
  id: string;
  customer_id: string;
  amount: number;
  date: string;
  status: 'pending' | 'paid';
}

export interface Revenue extends RowDataPacket {
  month: string;
  revenue: number;
}

export interface LatestInvoice extends RowDataPacket {
  id: string;
  name: string;
  image_url: string;
  email: string;
  amount: string;
}

export interface LatestInvoiceRaw
  extends RowDataPacket,
    Omit<LatestInvoice, 'amount'> {
  amount: number;
}

export interface Count extends RowDataPacket {
  count: number;
}

// Yes its overkill I am just too lazy to install lodash
// Also this is prettier and who cares
export interface StatusCount extends RowDataPacket {
  paid: number;
  pending: number;
}

export interface InvoicesTable extends RowDataPacket {
  id: string;
  customer_id: string;
  name: string;
  email: string;
  image_url: string;
  date: string;
  amount: number;
  status: 'pending' | 'paid';
}

export type CustomersTableType = {
  id: string;
  name: string;
  email: string;
  image_url: string;
  total_invoices: number;
  total_pending: number;
  total_paid: number;
};

export type FormattedCustomersTable = {
  id: string;
  name: string;
  email: string;
  image_url: string;
  total_invoices: number;
  total_pending: string;
  total_paid: string;
};

export interface CustomerField extends RowDataPacket {
  id: string;
  name: string;
}

export interface InvoiceForm extends RowDataPacket {
  id: string;
  customer_id: string;
  amount: number;
  status: 'pending' | 'paid';
}
