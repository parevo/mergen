package database

import (
	"fmt"
	"io"
	"net"
	"sync"

	"golang.org/x/crypto/ssh"
)

// SSHTunnel represents an SSH tunnel connection
type SSHTunnel struct {
	localAddr  string
	remoteAddr string
	config     *ssh.ClientConfig
	client     *ssh.Client
	listener   net.Listener
	done       chan struct{}
	wg         sync.WaitGroup
}

// NewSSHTunnel creates a new SSH tunnel from the connection config
func NewSSHTunnel(config ConnectionConfig) (*SSHTunnel, error) {
	if !config.UseSSHTunnel {
		return nil, nil
	}

	sshConfig := &ssh.ClientConfig{
		User:            config.SSHUser,
		HostKeyCallback: ssh.InsecureIgnoreHostKey(), // TODO: Add proper host key verification
	}

	// Configure authentication
	var authMethods []ssh.AuthMethod

	// Private key authentication
	if config.SSHPrivateKey != "" {
		var signer ssh.Signer
		var err error

		if config.SSHPassphrase != "" {
			signer, err = ssh.ParsePrivateKeyWithPassphrase([]byte(config.SSHPrivateKey), []byte(config.SSHPassphrase))
		} else {
			signer, err = ssh.ParsePrivateKey([]byte(config.SSHPrivateKey))
		}

		if err != nil {
			return nil, fmt.Errorf("failed to parse private key: %w", err)
		}
		authMethods = append(authMethods, ssh.PublicKeys(signer))
	}

	// Password authentication
	if config.SSHPassword != "" {
		authMethods = append(authMethods, ssh.Password(config.SSHPassword))
	}

	if len(authMethods) == 0 {
		return nil, fmt.Errorf("no SSH authentication method provided")
	}

	sshConfig.Auth = authMethods

	// Remote database address (what we're tunneling to)
	remoteAddr := fmt.Sprintf("%s:%d", config.Host, config.Port)

	return &SSHTunnel{
		remoteAddr: remoteAddr,
		config:     sshConfig,
		done:       make(chan struct{}),
	}, nil
}

// Start starts the SSH tunnel and returns the local address to connect to
func (t *SSHTunnel) Start(config ConnectionConfig) (string, error) {
	sshPort := config.SSHPort
	if sshPort == 0 {
		sshPort = 22
	}
	sshAddr := fmt.Sprintf("%s:%d", config.SSHHost, sshPort)

	// Connect to SSH server
	client, err := ssh.Dial("tcp", sshAddr, t.config)
	if err != nil {
		return "", fmt.Errorf("failed to connect to SSH server: %w", err)
	}
	t.client = client

	// Create local listener on random port
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		client.Close()
		return "", fmt.Errorf("failed to create local listener: %w", err)
	}
	t.listener = listener
	t.localAddr = listener.Addr().String()

	// Start accepting connections
	t.wg.Add(1)
	go t.acceptConnections()

	return t.localAddr, nil
}

// acceptConnections handles incoming connections to the tunnel
func (t *SSHTunnel) acceptConnections() {
	defer t.wg.Done()

	for {
		select {
		case <-t.done:
			return
		default:
		}

		conn, err := t.listener.Accept()
		if err != nil {
			select {
			case <-t.done:
				return
			default:
				continue
			}
		}

		t.wg.Add(1)
		go t.handleConnection(conn)
	}
}

// handleConnection forwards a single connection through the tunnel
func (t *SSHTunnel) handleConnection(localConn net.Conn) {
	defer t.wg.Done()
	defer localConn.Close()

	// Connect to remote through SSH
	remoteConn, err := t.client.Dial("tcp", t.remoteAddr)
	if err != nil {
		return
	}
	defer remoteConn.Close()

	// Bidirectional copy
	done := make(chan struct{}, 2)

	go func() {
		io.Copy(remoteConn, localConn)
		done <- struct{}{}
	}()

	go func() {
		io.Copy(localConn, remoteConn)
		done <- struct{}{}
	}()

	<-done
}

// Close shuts down the SSH tunnel
func (t *SSHTunnel) Close() error {
	close(t.done)

	if t.listener != nil {
		t.listener.Close()
	}

	if t.client != nil {
		t.client.Close()
	}

	t.wg.Wait()
	return nil
}

// LocalAddr returns the local address of the tunnel
func (t *SSHTunnel) LocalAddr() string {
	return t.localAddr
}
