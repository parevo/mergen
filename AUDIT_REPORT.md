# Mergen Repository Audit Report

**Date:** October 26, 2023
**Auditor:** Jules (Senior Software Architect & Cybersecurity Expert)
**Target:** Mergen Database Manager

## 1. Executive Summary

Mergen is a desktop database management tool built with Go (backend) and Wails (frontend). While the functional prototype demonstrates a clear separation of concerns between the frontend and backend, the codebase exhibits critical security vulnerabilities, specifically SQL Injection, and potential scalability issues due to inefficient memory management during data retrieval. The project currently lacks an automated testing suite, which poses a significant risk for regression and stability.

## 2. Architecture & Design Patterns

### Strengths
- **Modular Structure:** The project follows a clear directory structure (`database/`, `frontend/`, `app.go`), separating UI concerns from data access logic.
- **Strategy Pattern:** The `Driver` interface (`database/driver.go`) effectively uses the Strategy Pattern to support multiple database dialects (MySQL, Postgres), allowing for easy extension.

### Weaknesses
- **Tight Coupling:** The `App` struct is tightly coupled to `database.Manager`. Dependency Injection (DI) is not fully utilized, making it difficult to swap implementations for testing.
- **Interface Segregation:** The `Driver` interface is somewhat monolithic, handling connection management, schema inspection, and query building. Splitting this into `Connector`, `Inspector`, and `QueryBuilder` interfaces would adhere better to the Interface Segregation Principle (ISP).
- **Global State/Singleton-like Usage:** The `Manager` struct acts as a singleton within the `App`, but its dependency on global-like configuration storage reduces testability.

## 3. Security & Robustness

### Critical Vulnerabilities
1.  **SQL Injection (Critical):**
    -   **Location:** `database/mysql_driver.go` -> `BuildTableDataQuery`
    -   **Issue:** The `Filters` field from the frontend is directly injected into the SQL query string using `fmt.Sprintf(" WHERE %s", req.Filters)`. A malicious user (or a compromised frontend state) can execute arbitrary SQL commands.
    -   **Remediation:** Implement a structured filter object (e.g., `[]FilterCondition`) and build the `WHERE` clause using parameterized queries (placeholders).

2.  **Insecure Credential Storage (High):**
    -   **Location:** `database/storage.go`
    -   **Issue:** Database connection details, including passwords and SSH keys, are stored in plaintext in `~/.runedb/connections.json`.
    -   **Remediation:** Use the OS's native keychain/credential manager (e.g., `zalando/go-keyring`) to store sensitive data, or encrypt the configuration file using a user-provided master password.

3.  **Raw SQL Execution:**
    -   **Location:** `ExecuteQuery`
    -   **Issue:** While expected for a SQL editor, the `ExecuteQuery` method is exposed to the frontend. Ensure that internal application logic (non-user-triggered) does not use this method with unsanitized inputs.

### Robustness
-   **Error Handling:** Generally, errors are propagated up the stack, which is good. However, specific database errors (like connection timeouts or specific SQL errors) are not wrapped or typed, making it hard for the frontend to provide specific guidance to the user.

## 4. Performance & Scalability

### Issues
1.  **Memory Leaks / OOM Risk (High):**
    -   **Location:** `database/query.go` -> `ExecuteQuery`
    -   **Issue:** The method iterates through `rows.Next()` and appends all results to a slice in memory. For large tables (e.g., 1 million rows), this will cause the application to crash (Out Of Memory).
    -   **Remediation:** Implement cursor-based pagination or streaming for the raw query execution. For the table view (`GetTableData`), the existing `LIMIT`/`OFFSET` pagination is a good start but relies on the user not requesting `PageSize: 1000000`.

2.  **Connection Pooling:**
    -   **Configuration:** `db.SetMaxOpenConns(10)` is hardcoded in `mysql_driver.go`.
    -   **Issue:** While suitable for a single-user desktop app, this might be a bottleneck if the user opens many tabs or runs concurrent exports.
    -   **Remediation:** Allow this to be configurable via the connection settings.

## 5. Readability & Maintainability

-   **Naming Conventions:** Generally consistent (Go camelCase).
-   **Documentation:** Most public methods have basic comments. However, complex logic in `mysql_driver.go` (specifically the query builders) lacks explanation of the expected input formats.
-   **Code Duplication:** There is likely duplication between `mysql_driver.go` and `postgres_driver.go` (implied) for query building logic that could be shared (e.g., basic `SELECT` construction).

## 6. Testing & Quality Assurance

### Current State
-   **No Tests Found:** There are no `_test.go` files in the `database/` directory.

### Recommendations
1.  **Unit Tests:** Create unit tests for the `Driver` implementations, specifically for the query builder methods (`BuildTableDataQuery`, `BuildInsertQuery`) to ensure they handle edge cases and escaping correctly.
2.  **Integration Tests:** Create integration tests for `Manager` that spin up a Dockerized MySQL/Postgres instance to verify real database interactions.

### Top 3 Critical Functions to Test
1.  `database.Manager.GetTableData` - Core functionality for viewing data, complex logic involving pagination and filtering.
2.  `database.MySQLDriver.BuildTableDataQuery` - Critical for security (SQL injection prevention) and correctness.
3.  `database.Manager.Connect` - Essential for application startup; involves complex logic (SSH tunneling, SSL).

---
*End of Audit Report*
