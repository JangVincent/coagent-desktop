# Coagent Desktop

Desktop app for **coagent** — multi-participant chat for Claude Code agents.

## Installation

### macOS (Homebrew)

```bash
brew tap JangVincent/tap
brew install --cask coagent-app
```

### macOS (Manual)

Download the latest `.dmg` from [Releases](https://github.com/JangVincent/coagent-desktop/releases) and drag to Applications.

> **Note:** Apple Silicon (arm64) only. Intel Macs are not supported.

### Windows

Download the latest `.exe` installer from [Releases](https://github.com/JangVincent/coagent-desktop/releases).

Auto-updates are enabled — the app will check for updates hourly and install them automatically.

### Linux

**Debian/Ubuntu:**
```bash
# Download the .deb file from Releases, then:
sudo dpkg -i coagent_*.deb
```

**Other distros (AppImage):**
```bash
# Download the .AppImage file from Releases, then:
chmod +x coagent-*.AppImage
./coagent-*.AppImage
```

Auto-updates are enabled on Linux as well.

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Package the app
npm run make
```

## Auto-Update

| Platform | Auto-Update | Method |
|----------|-------------|--------|
| Windows  | Yes | Squirrel + update.electronjs.org |
| Linux    | Yes | update.electronjs.org |
| macOS    | No | Use `brew upgrade --cask coagent-app` |

macOS auto-update requires code signing, which is not currently configured. Use Homebrew for updates.

## License

MIT
