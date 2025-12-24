// Types that match the Go backend types

export interface ConnectionConfig {
  type: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;

  // Connection Color Coding
  color: string; // hex color e.g. "#ef4444" for prod

  // SSL/TLS Configuration
  useSSL: boolean;
  sslMode: string; // disable, require, verify-ca, verify-full
  sslCACert: string;
  sslClientCert: string;
  sslClientKey: string;

  // SSH Tunnel Configuration
  useSSHTunnel: boolean;
  sshHost: string;
  sshPort: number;
  sshUser: string;
  sshPassword: string;
  sshPrivateKey: string;
  sshPassphrase: string;
}

export interface SavedConnection {
  name: string;
  config: ConnectionConfig;
}

export interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
}

export interface ExecuteResult {
  rowsAffected: number;
  lastInsertId: number;
}

export interface DatabaseInfo {
  name: string;
}

export interface TableInfo {
  name: string;
  engine: string;
  rowCount: number;
  dataSize: number;
  createTime: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  key: string;
  default: string;
  extra: string;
  oldName?: string;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
}

export interface TableDetails {
  name: string;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string;
  url: string;
  hasUpdate: boolean;
}

// Table alteration request
export interface TableAlteration {
  addColumns: ColumnInfo[];
  modifyColumns: ColumnInfo[];
  dropColumns: string[];
  renameTo: string;
}

// Data editor request
export interface TableDataRequest {
  database: string;
  table: string;
  page: number;
  pageSize: number;
  orderBy: string;
  orderDir: 'ASC' | 'DESC';
  filters?: string; // SQL-like filter string
}

// Data editor response
export interface TableDataResponse {
  columns: ColumnInfo[];
  rows: any[][];
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
  primaryKey: string;
}

// Tree node for database explorer
export interface TreeNode {
  id: string;
  name: string;
  type: 'database' | 'table' | 'column';
  expanded: boolean;
  children?: TreeNode[];
  loading?: boolean;
}
