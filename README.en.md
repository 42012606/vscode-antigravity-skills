# VS Code Antigravity Skills

> **AI Coding Assistant Skills & Rules Manager | Manage and deploy AI Skills & Rules across projects.**

[![Version](https://img.shields.io/visual-studio-marketplace/v/42012606.vscode-antigravity-skills?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=42012606.vscode-antigravity-skills)
[![License](https://img.shields.io/github/license/42012606/vscode-antigravity-skills?style=flat-square)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/42012606/vscode-antigravity-skills?style=flat-square)](https://github.com/42012606/vscode-antigravity-skills/stargazers)

VS Code extension for unified management, deployment, and synchronization of Skills and Rules for Google Antigravity AI models.

**Features: Webview Dashboard · QuickPick Mode · Bidirectional Sync · Sidebar View · Status Bar Entry**

🇺🇸 English · [🇨🇳 简体中文](README.md)

---

## ✨ Features Overview

### 1. Webview Dashboard
![banner](resources/banner.png)

A visual management interface supporting:
- **Card View**: Clearly displays all Skills and Rules in your local library.
- **One-click Deployment**: Deploy button applies Skill/Rule to the current workspace instantly.
- **Status Monitoring**: Real-time tracking of deployed and pending items.

### 2. Core Feature: Reverse Sync 🔥
![reverse_sync](resources/reverse_sync.png)

The killer feature of **vscode-antigravity-skills**. Beyond deployment, we support syncing back to your library:
- **Auto Detection**: Scans your current workspace's `.agent/` directory for unique items.
- **Reverse Sync**: Click **"📥 Sync to Library"** to save locally created inspirations permanently.

### 3. Flexible Display Modes
![library_view](resources/library_view.png)

- **QuickPick Mode**: Prefer shortcuts? Use `Ctrl+Shift+K` for a native search menu.
- **Sidebar View**: Check deployment status anytime via the dedicated sidebar view.

---

## 🚀 Quick Start

### Installation
1. Search `Antigravity Skills Manager` in VS Code Marketplace.
2. Or install via VSIX: `code --install-extension antigravity-skills-manager-x.y.z.vsix`

### Usage
1. **Set Library Path**: Click **"📁 Set Path"** in the top-right to pick your local library.
2. **Deploy Items**: Find a Skill, click **"🚀 Deploy"**.
3. **Sync Back**: Created a new `.md` rule in your project? Use the dashboard to sync it back to your central library.

---

## 📁 Recommended Structure

For the best experience, structure your library as follows:

```text
MySkills/
├── .agent/
│   ├── skills/           # Custom skills directory
│   │   ├── project-sop/
│   │   │   └── SKILL.md
│   │   └── ...
│   └── rules/            # Global or specific rules
│       ├── global.md
│       └── ...
└── README.md
```

---

## ⌨️ Shortcuts
- `Ctrl+Shift+K`: Open Skills Manager Panel

---

## 🤝 Support

If this project helps you, please consider:
- ⭐ [GitHub Star](https://github.com/42012606/vscode-antigravity-skills) - Your support is my biggest motivation!
- 💬 [Report Issues](https://github.com/42012606/vscode-antigravity-skills/issues)

<a href="docs/SPONSOR.md" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

---

## License
MIT

## Disclaimer
This project is for individual learning and research purposes only.


