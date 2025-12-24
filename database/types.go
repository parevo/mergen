package database

// ConnectionConfig holds database connection configuration
type ConnectionConfig struct {
	Type     string `json:"type"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	User     string `json:"user"`
	Password string `json:"password"`
	Database string `json:"database"`

	// Connection Color Coding (for environment identification)
	Color string `json:"color"` // hex color e.g. "#ef4444" for prod

	// SSL/TLS Configuration
	UseSSL        bool   `json:"useSSL"`
	SSLMode       string `json:"sslMode"`       // disable, require, verify-ca, verify-full
	SSLCACert     string `json:"sslCACert"`     // CA certificate path or content
	SSLClientCert string `json:"sslClientCert"` // Client certificate
	SSLClientKey  string `json:"sslClientKey"`  // Client key

	// SSH Tunnel Configuration
	UseSSHTunnel  bool   `json:"useSSHTunnel"`
	SSHHost       string `json:"sshHost"`
	SSHPort       int    `json:"sshPort"`
	SSHUser       string `json:"sshUser"`
	SSHPassword   string `json:"sshPassword"`   // Optional, for password auth
	SSHPrivateKey string `json:"sshPrivateKey"` // PEM content or file path
	SSHPassphrase string `json:"sshPassphrase"` // Key passphrase if encrypted
}

// SavedConnection represents a saved connection with a name
type SavedConnection struct {
	Name   string           `json:"name"`
	Config ConnectionConfig `json:"config"`
}

// QueryResult holds the result of a SELECT query
type QueryResult struct {
	Columns  []string        `json:"columns"`
	Rows     [][]interface{} `json:"rows"`
	RowCount int             `json:"rowCount"`
}

// ExecuteResult holds the result of an INSERT/UPDATE/DELETE query
type ExecuteResult struct {
	RowsAffected int64 `json:"rowsAffected"`
	LastInsertId int64 `json:"lastInsertId"`
}

// DatabaseInfo represents a database
type DatabaseInfo struct {
	Name string `json:"name"`
}

// TableInfo represents a table
type TableInfo struct {
	Name       string `json:"name"`
	Engine     string `json:"engine"`
	RowCount   int64  `json:"rowCount"`
	DataSize   int64  `json:"dataSize"`
	CreateTime string `json:"createTime"`
}

// ColumnInfo represents a column
type ColumnInfo struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Nullable bool   `json:"nullable"`
	Key      string `json:"key"`
	Default  string `json:"default"`
	Extra    string `json:"extra"`
	OldName  string `json:"oldName,omitempty"` // For renaming columns
}

// IndexInfo represents an index
type IndexInfo struct {
	Name      string   `json:"name"`
	Columns   []string `json:"columns"`
	IsUnique  bool     `json:"isUnique"`
	IsPrimary bool     `json:"isPrimary"`
}

// TableDetails contains full table information
type TableDetails struct {
	Name    string       `json:"name"`
	Columns []ColumnInfo `json:"columns"`
	Indexes []IndexInfo  `json:"indexes"`
}
