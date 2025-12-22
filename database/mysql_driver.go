package database

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

type MySQLDriver struct{}

func (d *MySQLDriver) Connect(config ConnectionConfig) (*sql.DB, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true",
		config.User, config.Password, config.Host, config.Port, config.Database)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open connection: %w", err)
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(time.Minute * 5)

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

func (d *MySQLDriver) GetDatabases(db *sql.DB) ([]string, error) {
	rows, err := db.Query("SHOW DATABASES")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var databases []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		databases = append(databases, name)
	}
	return databases, nil
}

func (d *MySQLDriver) GetTables(db *sql.DB, database string) ([]TableInfo, error) {
	query := fmt.Sprintf("SHOW TABLE STATUS FROM `%s`", database)
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []TableInfo
	for rows.Next() {
		columns, _ := rows.Columns()
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return nil, err
		}

		var table TableInfo
		for i, colName := range columns {
			val := values[i]
			if val == nil {
				continue
			}
			switch colName {
			case "Name":
				table.Name = string(val.([]uint8))
			case "Engine":
				table.Engine = string(val.([]uint8))
			case "Rows":
				if v, ok := val.(int64); ok {
					table.RowCount = v
				} else if v, ok := val.(uint64); ok {
					table.RowCount = int64(v)
				}
			case "Data_length":
				if v, ok := val.(int64); ok {
					table.DataSize = v
				} else if v, ok := val.(uint64); ok {
					table.DataSize = int64(v)
				}
			case "Create_time":
				if t, ok := val.(time.Time); ok {
					table.CreateTime = t.Format("2006-01-02 15:04:05")
				}
			}
		}
		tables = append(tables, table)
	}
	return tables, nil
}

func (d *MySQLDriver) GetColumns(db *sql.DB, database, table string) ([]ColumnInfo, error) {
	query := fmt.Sprintf("SHOW FULL COLUMNS FROM `%s`.`%s`", database, table)
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var columns []ColumnInfo
	for rows.Next() {
		var field, typeStr, collation, null, key, defaultVal, extra, privileges, comment sql.NullString
		if err := rows.Scan(&field, &typeStr, &collation, &null, &key, &defaultVal, &extra, &privileges, &comment); err != nil {
			return nil, err
		}

		columns = append(columns, ColumnInfo{
			Name:     field.String,
			Type:     typeStr.String,
			Nullable: strings.ToUpper(null.String) == "YES",
			Key:      key.String,
			Default:  defaultVal.String,
			Extra:    extra.String,
		})
	}
	return columns, nil
}

func (d *MySQLDriver) GetIndexes(db *sql.DB, database, table string) ([]IndexInfo, error) {
	query := fmt.Sprintf("SHOW INDEX FROM `%s`.`%s`", database, table)
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	indexMap := make(map[string]*IndexInfo)
	for rows.Next() {
		var tableStr, nonUnique, keyName, seqInIndex, columnName, collation, cardinality, subPart, packed, null, indexType, comment, indexComment sql.NullString
		if err := rows.Scan(&tableStr, &nonUnique, &keyName, &seqInIndex, &columnName, &collation, &cardinality, &subPart, &packed, &null, &indexType, &comment, &indexComment); err != nil {
			return nil, err
		}

		idx, exists := indexMap[keyName.String]
		if !exists {
			idx = &IndexInfo{
				Name:      keyName.String,
				Columns:   []string{},
				IsUnique:  nonUnique.String == "0",
				IsPrimary: keyName.String == "PRIMARY",
			}
			indexMap[keyName.String] = idx
		}
		idx.Columns = append(idx.Columns, columnName.String)
	}

	var indexes []IndexInfo
	for _, idx := range indexMap {
		indexes = append(indexes, *idx)
	}
	return indexes, nil
}

func (d *MySQLDriver) BuildTableDataQuery(req TableDataRequest, primaryKey string) string {
	where := ""
	if req.Filters != "" {
		where = fmt.Sprintf(" WHERE %s", req.Filters)
	}

	orderBy := req.OrderBy
	if orderBy == "" && primaryKey != "" {
		orderBy = primaryKey
	}
	orderDir := strings.ToUpper(req.OrderDir)
	if orderDir != "DESC" {
		orderDir = "ASC"
	}

	query := fmt.Sprintf("SELECT * FROM `%s`.`%s` %s", req.Database, req.Table, where)
	if orderBy != "" {
		query += fmt.Sprintf(" ORDER BY `%s` %s", orderBy, orderDir)
	}

	pageSize := req.PageSize
	if pageSize <= 0 {
		pageSize = 50
	}
	offset := (req.Page - 1) * pageSize
	query += fmt.Sprintf(" LIMIT %d OFFSET %d", pageSize, offset)

	return query
}

func (d *MySQLDriver) BuildCountQuery(database, table, filters string) string {
	where := ""
	if filters != "" {
		where = fmt.Sprintf(" WHERE %s", filters)
	}
	return fmt.Sprintf("SELECT COUNT(*) FROM `%s`.`%s` %s", database, table, where)
}

func (d *MySQLDriver) BuildAlterTableQuery(database, table string, alteration TableAlteration) ([]string, error) {
	var statements []string

	// Rename table if requested
	if alteration.RenameTo != "" && alteration.RenameTo != table {
		statements = append(statements, fmt.Sprintf("ALTER TABLE `%s`.`%s` RENAME TO `%s`", database, table, alteration.RenameTo))
		table = alteration.RenameTo
	}

	// Drop columns
	for _, col := range alteration.DropColumns {
		statements = append(statements, fmt.Sprintf("ALTER TABLE `%s`.`%s` DROP COLUMN `%s`", database, table, col))
	}

	// Add columns
	for _, col := range alteration.AddColumns {
		nullStr := "NOT NULL"
		if col.Nullable {
			nullStr = "NULL"
		}
		defaultStr := ""
		if col.Default != "" {
			defaultStr = fmt.Sprintf(" DEFAULT '%s'", col.Default)
		}
		statements = append(statements, fmt.Sprintf("ALTER TABLE `%s`.`%s` ADD COLUMN `%s` %s %s%s %s",
			database, table, col.Name, col.Type, nullStr, defaultStr, col.Extra))
	}

	// Modify columns
	for _, col := range alteration.ModifyColumns {
		nullStr := "NOT NULL"
		if col.Nullable {
			nullStr = "NULL"
		}
		defaultStr := ""
		if col.Default != "" {
			defaultStr = fmt.Sprintf(" DEFAULT '%s'", col.Default)
		}
		statements = append(statements, fmt.Sprintf("ALTER TABLE `%s`.`%s` MODIFY COLUMN `%s` %s %s%s %s",
			database, table, col.Name, col.Type, nullStr, defaultStr, col.Extra))
	}

	return statements, nil
}

func (d *MySQLDriver) BuildTruncateTableQuery(database, table string) string {
	return fmt.Sprintf("TRUNCATE TABLE `%s`.`%s`", database, table)
}

func (d *MySQLDriver) BuildDropTableQuery(database, table string) string {
	return fmt.Sprintf("DROP TABLE `%s`.`%s`", database, table)
}

func (d *MySQLDriver) BuildInsertQuery(database, table string, columns []string) string {
	quotedCols := make([]string, len(columns))
	placeholders := make([]string, len(columns))
	for i, col := range columns {
		quotedCols[i] = d.QuoteIdentifier(col)
		placeholders[i] = "?"
	}
	return fmt.Sprintf("INSERT INTO `%s`.`%s` (%s) VALUES (%s)",
		database, table, strings.Join(quotedCols, ", "), strings.Join(placeholders, ", "))
}

func (d *MySQLDriver) BuildUpdateQuery(database, table, primaryKey string, columns []string) string {
	setClauses := make([]string, len(columns))
	for i, col := range columns {
		setClauses[i] = fmt.Sprintf("%s = ?", d.QuoteIdentifier(col))
	}
	return fmt.Sprintf("UPDATE `%s`.`%s` SET %s WHERE %s = ?",
		database, table, strings.Join(setClauses, ", "), d.QuoteIdentifier(primaryKey))
}

func (d *MySQLDriver) BuildDeleteQuery(database, table, primaryKey string) string {
	return fmt.Sprintf("DELETE FROM `%s`.`%s` WHERE %s = ?",
		database, table, d.QuoteIdentifier(primaryKey))
}

func (d *MySQLDriver) BuildBatchDeleteQuery(database, table, primaryKey string, count int) string {
	placeholders := make([]string, count)
	for i := range placeholders {
		placeholders[i] = "?"
	}
	return fmt.Sprintf("DELETE FROM `%s`.`%s` WHERE %s IN (%s)",
		database, table, d.QuoteIdentifier(primaryKey), strings.Join(placeholders, ", "))
}

func (d *MySQLDriver) QuoteIdentifier(name string) string {
	return fmt.Sprintf("`%s`", name)
}
