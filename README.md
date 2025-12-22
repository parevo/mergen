# RuneDB ⚡

RuneDB is a modern, lightweight, and cross-platform database manager designed for developers who value speed and aesthetics. Built with **Wails**, **Go**, and **React**, it provides a seamless experience for managing MySQL and PostgreSQL databases with a focus on visual clarity and powerful features.

![RuneDB Preview](https://raw.githubusercontent.com/wailsapp/wails/master/website/src/assets/images/wails-logo.png) <!-- Replace with actual screenshot later -->

## ✨ Features

- **Multi-Database Support**: Native support for **MySQL** and **PostgreSQL**.
- **Modern SQL Editor**: Execute complex queries with syntax highlighting and results export.
- **Visual Data Editor (CRUD)**: Easily view, insert, update, and delete rows without writing SQL.
- **Connection Manager**: Securely save and manage multiple database connections with custom naming.
- **Schema Explorer**: Navigate through databases, tables, and columns with ease.
- **Cross-Platform**: Native performance on Windows, macOS, and Linux.
- **Fast & Lightweight**: Built on the Wails framework for minimal resource footprint.

## 🛠️ Tech Stack

- **Backend**: [Go](https://go.dev/) (Golang)
- **Frontend**: [React](https://reactjs.org/) with [TypeScript](https://www.typescriptlang.org/)
- **Styling**: Modern CSS / Tailwind
- **Framework**: [Wails v2](https://wails.io/)

## 🚀 Getting Started

### Prerequisites

- [Go](https://go.dev/doc/install) (1.23 or later)
- [Node.js](https://nodejs.org/) (20 or later) & NPM
- [Wails CLI](https://wails.io/docs/gettingstarted/installation)

### Development

To run the application in live development mode:

```bash
wails dev
```

### Building

To build a production-ready desktop application for your current platform:

```bash
wails build
```

The binary will be located in the `build/bin/` directory.

## 🐳 GitHub Actions

RuneDB includes a robust CI/CD pipeline that automatically builds and releases the application for Windows, macOS, and Linux upon pushing a version tag (e.g., `v1.0.0`).

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to improve RuneDB.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ by [ahmetbilgay](https://github.com/ahmetbilgay)
