package database

import (
	"database/sql"
)

// Driver defines the behavior for different database dialects
type Driver interface {
	// Connection
	Connect(config ConnectionConfig) (*sql.DB, error)

	// Schema Inspection
	GetDatabases(db *sql.DB) ([]string, error)
	GetTables(db *sql.DB, database string) ([]TableInfo, error)
	GetColumns(db *sql.DB, database, table string) ([]ColumnInfo, error)
	GetIndexes(db *sql.DB, database, table string) ([]IndexInfo, error)

	// Query Building & Dialect Specifics
	BuildTableDataQuery(req TableDataRequest, primaryKey string) string
	BuildCountQuery(database, table, filters string) string

	// Table Operations
	BuildAlterTableQuery(database, table string, alteration TableAlteration) ([]string, error)
	BuildTruncateTableQuery(database, table string) string
	BuildDropTableQuery(database, table string) string

	// CRUD Operations
	BuildInsertQuery(database, table string, columns []string) string
	BuildUpdateQuery(database, table, primaryKey string, columns []string) string
	BuildDeleteQuery(database, table, primaryKey string) string
	BuildBatchDeleteQuery(database, table, primaryKey string, count int) string

	// Quote identifiers (backticks for MySQL, double quotes for Postgres)
	QuoteIdentifier(name string) string
}
