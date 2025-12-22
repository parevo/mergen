package database

import (
	"fmt"
)

// TableDataRequest represents a request for paginated table data
type TableDataRequest struct {
	Database string `json:"database"`
	Table    string `json:"table"`
	Page     int    `json:"page"`
	PageSize int    `json:"pageSize"`
	OrderBy  string `json:"orderBy"`
	OrderDir string `json:"orderDir"`
	Filters  string `json:"filters"`
}

// TableDataResponse represents paginated table data with metadata
type TableDataResponse struct {
	Columns    []ColumnInfo    `json:"columns"`
	Rows       [][]interface{} `json:"rows"`
	TotalRows  int64           `json:"totalRows"`
	Page       int             `json:"page"`
	PageSize   int             `json:"pageSize"`
	TotalPages int             `json:"totalPages"`
	PrimaryKey string          `json:"primaryKey"`
}

// RowData represents a single row with column-value pairs
type RowData map[string]interface{}

// GetTableData returns paginated table data
func (m *Manager) GetTableData(req TableDataRequest) (*TableDataResponse, error) {
	db := m.getDB()
	if db == nil {
		return nil, fmt.Errorf("not connected to database")
	}

	// Get columns info
	columns, err := m.GetColumns(req.Database, req.Table)
	if err != nil {
		return nil, err
	}

	// Find primary key
	var primaryKey string
	for _, col := range columns {
		if col.Key == "PRI" {
			primaryKey = col.Name
			break
		}
	}

	// Get total row count
	var totalRows int64
	countQuery := m.driver.BuildCountQuery(req.Database, req.Table, req.Filters)
	if err := db.QueryRow(countQuery).Scan(&totalRows); err != nil {
		return nil, fmt.Errorf("failed to count rows: %w", err)
	}

	// Build query with pagination
	pageSize := req.PageSize
	if pageSize <= 0 {
		pageSize = 50
	}
	page := req.Page
	if page < 1 {
		page = 1
	}

	query := m.driver.BuildTableDataQuery(req, primaryKey)

	// Execute query
	result, err := m.ExecuteQuery(query)
	if err != nil {
		return nil, err
	}

	totalPages := int(totalRows) / pageSize
	if int(totalRows)%pageSize != 0 {
		totalPages++
	}

	return &TableDataResponse{
		Columns:    columns,
		Rows:       result.Rows,
		TotalRows:  totalRows,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
		PrimaryKey: primaryKey,
	}, nil
}

// InsertRow inserts a new row into a table
func (m *Manager) InsertRow(database, table string, data RowData) (*ExecuteResult, error) {
	db := m.getDB()
	if db == nil {
		return nil, fmt.Errorf("not connected to database")
	}

	if len(data) == 0 {
		return nil, fmt.Errorf("no data provided")
	}

	var columns []string
	var values []interface{}

	for col, val := range data {
		columns = append(columns, col)
		values = append(values, val)
	}

	query := m.driver.BuildInsertQuery(database, table, columns)

	res, err := db.Exec(query, values...)
	if err != nil {
		return nil, fmt.Errorf("insert failed: %w", err)
	}

	rowsAffected, _ := res.RowsAffected()
	lastInsertId, _ := res.LastInsertId()

	return &ExecuteResult{
		RowsAffected: rowsAffected,
		LastInsertId: lastInsertId,
	}, nil
}

// UpdateRow updates a row by primary key
func (m *Manager) UpdateRow(database, table, primaryKey string, primaryValue interface{}, data RowData) (*ExecuteResult, error) {
	db := m.getDB()
	if db == nil {
		return nil, fmt.Errorf("not connected to database")
	}

	if len(data) == 0 {
		return nil, fmt.Errorf("no data provided")
	}

	var columns []string
	var values []interface{}

	for col, val := range data {
		columns = append(columns, col)
		values = append(values, val)
	}
	values = append(values, primaryValue)

	query := m.driver.BuildUpdateQuery(database, table, primaryKey, columns)

	res, err := db.Exec(query, values...)
	if err != nil {
		return nil, fmt.Errorf("update failed: %w", err)
	}

	rowsAffected, _ := res.RowsAffected()

	return &ExecuteResult{
		RowsAffected: rowsAffected,
	}, nil
}

// DeleteRow deletes a row by primary key
func (m *Manager) DeleteRow(database, table, primaryKey string, primaryValue interface{}) (*ExecuteResult, error) {
	db := m.getDB()
	if db == nil {
		return nil, fmt.Errorf("not connected to database")
	}

	query := m.driver.BuildDeleteQuery(database, table, primaryKey)

	res, err := db.Exec(query, primaryValue)
	if err != nil {
		return nil, fmt.Errorf("delete failed: %w", err)
	}

	rowsAffected, _ := res.RowsAffected()

	return &ExecuteResult{
		RowsAffected: rowsAffected,
	}, nil
}

// DeleteRows deletes multiple rows by primary key values
func (m *Manager) DeleteRows(database, table, primaryKey string, primaryValues []interface{}) (*ExecuteResult, error) {
	db := m.getDB()
	if db == nil {
		return nil, fmt.Errorf("not connected to database")
	}

	if len(primaryValues) == 0 {
		return &ExecuteResult{}, nil
	}

	query := m.driver.BuildBatchDeleteQuery(database, table, primaryKey, len(primaryValues))

	res, err := db.Exec(query, primaryValues...)
	if err != nil {
		return nil, fmt.Errorf("delete failed: %w", err)
	}

	rowsAffected, _ := res.RowsAffected()

	return &ExecuteResult{
		RowsAffected: rowsAffected,
	}, nil
}
