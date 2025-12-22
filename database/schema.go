package database

import (
	"fmt"
)

// GetDatabases returns list of all databases
func (m *Manager) GetDatabases() ([]DatabaseInfo, error) {
	db := m.getDB()
	if db == nil {
		return nil, fmt.Errorf("not connected to database")
	}

	names, err := m.driver.GetDatabases(db)
	if err != nil {
		return nil, fmt.Errorf("failed to get databases: %w", err)
	}

	var databases []DatabaseInfo
	for _, name := range names {
		databases = append(databases, DatabaseInfo{Name: name})
	}

	return databases, nil
}

// GetTables returns list of tables in a database
func (m *Manager) GetTables(database string) ([]TableInfo, error) {
	db := m.getDB()
	if db == nil {
		return nil, fmt.Errorf("not connected to database")
	}

	tables, err := m.driver.GetTables(db, database)
	if err != nil {
		return nil, fmt.Errorf("failed to get tables: %w", err)
	}

	return tables, nil
}

// GetColumns returns list of columns in a table
func (m *Manager) GetColumns(database, table string) ([]ColumnInfo, error) {
	db := m.getDB()
	if db == nil {
		return nil, fmt.Errorf("not connected to database")
	}

	columns, err := m.driver.GetColumns(db, database, table)
	if err != nil {
		return nil, fmt.Errorf("failed to get columns: %w", err)
	}

	return columns, nil
}

// GetTableInfo returns detailed information about a table
func (m *Manager) GetTableInfo(database, table string) (*TableDetails, error) {
	columns, err := m.GetColumns(database, table)
	if err != nil {
		return nil, err
	}

	indexes, err := m.GetIndexes(database, table)
	if err != nil {
		return nil, err
	}

	return &TableDetails{
		Name:    table,
		Columns: columns,
		Indexes: indexes,
	}, nil
}

// GetIndexes returns list of indexes on a table
func (m *Manager) GetIndexes(database, table string) ([]IndexInfo, error) {
	db := m.getDB()
	if db == nil {
		return nil, fmt.Errorf("not connected to database")
	}

	indexes, err := m.driver.GetIndexes(db, database, table)
	if err != nil {
		return nil, fmt.Errorf("failed to get indexes: %w", err)
	}

	return indexes, nil
}

// UseDatabase switches to a specific database
func (m *Manager) UseDatabase(database string) error {
	db := m.getDB()
	if db == nil {
		return fmt.Errorf("not connected to database")
	}

	// Dialect specific switch might be needed, but USE is fairly common.
	// For now, let's just use a raw statement, but PostgreSQL uses a different connection.
	// We might need Driver.SwitchDatabase in the future.
	_, err := db.Exec("USE " + m.driver.QuoteIdentifier(database))
	if err != nil {
		return fmt.Errorf("failed to switch database: %w", err)
	}

	if m.config != nil {
		m.config.Database = database
	}

	return nil
}

// TruncateTable removes all rows from a table
func (m *Manager) TruncateTable(database, table string) error {
	db := m.getDB()
	if db == nil {
		return fmt.Errorf("not connected to database")
	}

	query := m.driver.BuildTruncateTableQuery(database, table)
	_, err := db.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to truncate table: %w", err)
	}

	return nil
}

// DropTable deletes a table
func (m *Manager) DropTable(database, table string) error {
	db := m.getDB()
	if db == nil {
		return fmt.Errorf("not connected to database")
	}

	query := m.driver.BuildDropTableQuery(database, table)
	_, err := db.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to drop table: %w", err)
	}

	return nil
}
