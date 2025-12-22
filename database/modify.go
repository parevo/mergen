package database

import (
	"fmt"
)

// TableAlteration represents a change to a table schema
type TableAlteration struct {
	AddColumns    []ColumnInfo `json:"addColumns"`
	ModifyColumns []ColumnInfo `json:"modifyColumns"`
	DropColumns   []string     `json:"dropColumns"`
	RenameTo      string       `json:"renameTo"`
}

// AlterTable performs schema modifications on a table
func (m *Manager) AlterTable(database, table string, alteration TableAlteration) error {
	db := m.getDB()
	if db == nil {
		return fmt.Errorf("not connected to database")
	}

	queries, err := m.driver.BuildAlterTableQuery(database, table, alteration)
	if err != nil {
		return err
	}

	for _, query := range queries {
		_, err := db.Exec(query)
		if err != nil {
			return fmt.Errorf("failed to execute alter query [%s]: %w", query, err)
		}
	}

	return nil
}
