package database

import (
	"fmt"
)

// ExecuteQuery runs a SELECT query and returns results
func (m *Manager) ExecuteQuery(query string) (*QueryResult, error) {
	db := m.getDB()
	if db == nil {
		return nil, fmt.Errorf("not connected to database")
	}

	rows, err := db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("query failed: %w", err)
	}
	defer rows.Close()

	// Get column names
	columns, err := rows.Columns()
	if err != nil {
		return nil, fmt.Errorf("failed to get columns: %w", err)
	}

	result := &QueryResult{
		Columns: columns,
		Rows:    make([][]interface{}, 0),
	}

	// Create a slice of interface{} to hold row values
	values := make([]interface{}, len(columns))
	valuePtrs := make([]interface{}, len(columns))
	for i := range values {
		valuePtrs[i] = &values[i]
	}

	// Fetch all rows
	for rows.Next() {
		if err := rows.Scan(valuePtrs...); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}

		// Convert values to JSON-serializable types
		row := make([]interface{}, len(columns))
		for i, v := range values {
			switch val := v.(type) {
			case []byte:
				row[i] = string(val)
			case nil:
				row[i] = nil
			default:
				row[i] = val
			}
		}
		result.Rows = append(result.Rows, row)
	}

	result.RowCount = len(result.Rows)
	return result, nil
}

// ExecuteStatement runs an INSERT/UPDATE/DELETE statement
func (m *Manager) ExecuteStatement(query string) (*ExecuteResult, error) {
	db := m.getDB()
	if db == nil {
		return nil, fmt.Errorf("not connected to database")
	}

	res, err := db.Exec(query)
	if err != nil {
		return nil, fmt.Errorf("statement failed: %w", err)
	}

	rowsAffected, _ := res.RowsAffected()
	lastInsertId, _ := res.LastInsertId()

	return &ExecuteResult{
		RowsAffected: rowsAffected,
		LastInsertId: lastInsertId,
	}, nil
}
