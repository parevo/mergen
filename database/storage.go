package database

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// Storage handles saving and loading connections
type Storage struct {
	configPath string
}

// NewStorage creates a new storage instance
func NewStorage() (*Storage, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("failed to get home directory: %w", err)
	}

	configDir := filepath.Join(homeDir, ".runedb")
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create config directory: %w", err)
	}

	return &Storage{
		configPath: filepath.Join(configDir, "connections.json"),
	}, nil
}

// SaveConnection saves a connection with a name
func (s *Storage) SaveConnection(name string, config ConnectionConfig) error {
	connections, err := s.LoadConnections()
	if err != nil {
		connections = []SavedConnection{}
	}

	// Update existing or add new
	found := false
	for i, c := range connections {
		if c.Name == name {
			connections[i].Config = config
			found = true
			break
		}
	}

	if !found {
		connections = append(connections, SavedConnection{
			Name:   name,
			Config: config,
		})
	}

	return s.saveConnections(connections)
}

// LoadConnections loads all saved connections
func (s *Storage) LoadConnections() ([]SavedConnection, error) {
	data, err := os.ReadFile(s.configPath)
	if err != nil {
		if os.IsNotExist(err) {
			return []SavedConnection{}, nil
		}
		return nil, fmt.Errorf("failed to read connections: %w", err)
	}

	var connections []SavedConnection
	if err := json.Unmarshal(data, &connections); err != nil {
		return nil, fmt.Errorf("failed to parse connections: %w", err)
	}

	return connections, nil
}

// DeleteConnection removes a saved connection
func (s *Storage) DeleteConnection(name string) error {
	connections, err := s.LoadConnections()
	if err != nil {
		return err
	}

	var filtered []SavedConnection
	for _, c := range connections {
		if c.Name != name {
			filtered = append(filtered, c)
		}
	}

	return s.saveConnections(filtered)
}

// GetConnection returns a specific saved connection
func (s *Storage) GetConnection(name string) (*SavedConnection, error) {
	connections, err := s.LoadConnections()
	if err != nil {
		return nil, err
	}

	for _, c := range connections {
		if c.Name == name {
			return &c, nil
		}
	}

	return nil, fmt.Errorf("connection not found: %s", name)
}

// RenameConnection renames a saved connection
func (s *Storage) RenameConnection(oldName, newName string) error {
	connections, err := s.LoadConnections()
	if err != nil {
		return err
	}

	found := false
	for i, c := range connections {
		if c.Name == oldName {
			connections[i].Name = newName
			found = true
			break
		}
	}

	if !found {
		return fmt.Errorf("connection not found: %s", oldName)
	}

	return s.saveConnections(connections)
}

func (s *Storage) saveConnections(connections []SavedConnection) error {
	data, err := json.MarshalIndent(connections, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal connections: %w", err)
	}

	if err := os.WriteFile(s.configPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write connections: %w", err)
	}

	return nil
}
