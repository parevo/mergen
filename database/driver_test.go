package database

import (
	"strings"
	"testing"
)

// MockDriver is a mock implementation of the Driver interface for testing
type MockDriver struct {
	MySQLDriver // Embed MySQLDriver to reuse query builders for testing
}

// TestMySQLDriver_BuildTableDataQuery tests the query construction for table data
func TestMySQLDriver_BuildTableDataQuery(t *testing.T) {
	driver := &MySQLDriver{}

	tests := []struct {
		name       string
		req        TableDataRequest
		primaryKey string
		expected   string
	}{
		{
			name: "Basic Select",
			req: TableDataRequest{
				Database: "testdb",
				Table:    "users",
				Page:     1,
				PageSize: 10,
			},
			primaryKey: "id",
			expected:   "SELECT * FROM `testdb`.`users`  ORDER BY `id` ASC LIMIT 10 OFFSET 0",
		},
		{
			name: "Pagination",
			req: TableDataRequest{
				Database: "testdb",
				Table:    "users",
				Page:     2,
				PageSize: 20,
			},
			primaryKey: "id",
			expected:   "SELECT * FROM `testdb`.`users`  ORDER BY `id` ASC LIMIT 20 OFFSET 20",
		},
		{
			name: "Custom Sort",
			req: TableDataRequest{
				Database: "testdb",
				Table:    "users",
				Page:     1,
				PageSize: 10,
				OrderBy:  "created_at",
				OrderDir: "DESC",
			},
			primaryKey: "id",
			expected:   "SELECT * FROM `testdb`.`users`  ORDER BY `created_at` DESC LIMIT 10 OFFSET 0",
		},
		// NOTE: This test case demonstrates the SQL Injection vulnerability identified in the audit.
		// A fix would involve sanitizing or parameterizing the Filters field.
		{
			name: "Filter Injection Vulnerability Demonstration",
			req: TableDataRequest{
				Database: "testdb",
				Table:    "users",
				Page:     1,
				PageSize: 10,
				Filters:  "id = 1; DROP TABLE users; --",
			},
			primaryKey: "id",
			expected:   "SELECT * FROM `testdb`.`users`  WHERE id = 1; DROP TABLE users; -- ORDER BY `id` ASC LIMIT 10 OFFSET 0",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := driver.BuildTableDataQuery(tt.req, tt.primaryKey)
			// Normalize whitespace for comparison
			got = strings.Join(strings.Fields(got), " ")
			expected := strings.Join(strings.Fields(tt.expected), " ")

			if got != expected {
				t.Errorf("BuildTableDataQuery() = %v, want %v", got, expected)
			}
		})
	}
}

// TestMySQLDriver_BuildInsertQuery tests the INSERT query builder
func TestMySQLDriver_BuildInsertQuery(t *testing.T) {
	driver := &MySQLDriver{}

	database := "testdb"
	table := "users"
	columns := []string{"name", "email", "role"}

	expected := "INSERT INTO `testdb`.`users` (`name`, `email`, `role`) VALUES (?, ?, ?)"
	got := driver.BuildInsertQuery(database, table, columns)

	if got != expected {
		t.Errorf("BuildInsertQuery() = %v, want %v", got, expected)
	}
}

// TestMySQLDriver_BuildUpdateQuery tests the UPDATE query builder
func TestMySQLDriver_BuildUpdateQuery(t *testing.T) {
	driver := &MySQLDriver{}

	database := "testdb"
	table := "users"
	primaryKey := "id"
	columns := []string{"name", "email"}

	expected := "UPDATE `testdb`.`users` SET `name` = ?, `email` = ? WHERE `id` = ?"
	got := driver.BuildUpdateQuery(database, table, primaryKey, columns)

	if got != expected {
		t.Errorf("BuildUpdateQuery() = %v, want %v", got, expected)
	}
}

// TestMySQLDriver_QuoteIdentifier tests identifier escaping
func TestMySQLDriver_QuoteIdentifier(t *testing.T) {
	driver := &MySQLDriver{}

	tests := []struct {
		input    string
		expected string
	}{
		{"table", "`table`"},
		{"user_name", "`user_name`"},
		// Note: Current implementation does not escape backticks inside the string,
		// which is another potential issue identified in the audit.
		{"ta`ble", "`ta`ble`"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := driver.QuoteIdentifier(tt.input)
			if got != tt.expected {
				t.Errorf("QuoteIdentifier(%q) = %v, want %v", tt.input, got, tt.expected)
			}
		})
	}
}
