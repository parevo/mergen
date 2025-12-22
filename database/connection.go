package database

import (
	"database/sql"
	"fmt"
	"strings"
	"sync"
)

// Manager handles all database operations
type Manager struct {
	db     *sql.DB
	config *ConnectionConfig
	driver Driver
	mu     sync.RWMutex
}

// NewManager creates a new database manager
func NewManager() *Manager {
	return &Manager{}
}

// getDriver returns the appropriate driver for the config
func (m *Manager) getDriver(config ConnectionConfig) (Driver, error) {
	switch strings.ToLower(config.Type) {
	case "mysql", "": // Default to mysql for backward compatibility
		return &MySQLDriver{}, nil
	case "postgres":
		return &PostgresDriver{}, nil
	default:
		return nil, fmt.Errorf("unsupported database type: %s", config.Type)
	}
}

// strings is needed for strings.ToLower, let me check imports.
// Actually I'll just write the file with correct imports.

// Connect establishes a connection to the database
func (m *Manager) Connect(config ConnectionConfig) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Close existing connection if any
	if m.db != nil {
		m.db.Close()
	}

	driver, err := m.getDriver(config)
	if err != nil {
		return err
	}

	db, err := driver.Connect(config)
	if err != nil {
		return err
	}

	m.db = db
	m.config = &config
	m.driver = driver
	return nil
}

// Disconnect closes the database connection
func (m *Manager) Disconnect() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.db != nil {
		err := m.db.Close()
		m.db = nil
		m.config = nil
		m.driver = nil
		return err
	}
	return nil
}

// TestConnection tests if a connection can be established
func (m *Manager) TestConnection(config ConnectionConfig) (bool, error) {
	driver, err := m.getDriver(config)
	if err != nil {
		return false, err
	}

	db, err := driver.Connect(config)
	if err != nil {
		return false, err
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		return false, fmt.Errorf("failed to ping: %w", err)
	}

	return true, nil
}

// IsConnected returns whether we're connected to a database
func (m *Manager) IsConnected() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.db != nil
}

// GetCurrentConfig returns the current connection config
func (m *Manager) GetCurrentConfig() *ConnectionConfig {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.config
}

// getDB returns the database connection for internal use
func (m *Manager) getDB() *sql.DB {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.db
}
