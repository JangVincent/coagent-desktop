# Coagent Desktop

Desktop app for **coagent** — multi-participant chat for Claude Code agents.

[한국어](README.ko.md)

## Prerequisites

Before using coagent, you need Claude Code CLI authenticated on your machine.

### Option 1: Login with Claude Account (Recommended)

```bash
# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Login to your Claude account
claude login
```

### Option 2: Use API Key

```bash
# Set your Anthropic API key as an environment variable
export ANTHROPIC_API_KEY="sk-ant-api03-..."
```

Add this to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.) to persist across sessions.

> This only needs to be done once per machine. Agents spawned by coagent will use your authenticated session or API key.

## Installation

### macOS (Homebrew)

```bash
brew tap JangVincent/tap
brew install --cask coagent-app
```

To upgrade later, always run `brew update` first so the tap pulls the latest formula:

```bash
brew update && brew upgrade --cask coagent-app
```

> **Heads up:** the first launch will show **"coagent is damaged and can't be opened"** — this happens with the Homebrew cask too. See [First launch on macOS](#first-launch-on-macos) below to clear it.

### macOS (Manual)

Download the latest `.dmg` from [Releases](https://github.com/JangVincent/coagent-app/releases) and drag to Applications.

> **Note:** Apple Silicon (arm64) only. Intel Macs are not supported.

### First launch on macOS

The app is not notarized, so macOS quarantines it on first launch and shows **"coagent is damaged and can't be opened"**. This affects every install method (Homebrew cask and manual `.dmg`). Clear the quarantine attribute once per install:

```bash
sudo xattr -dr com.apple.quarantine /Applications/coagent.app
```

You'll need to rerun this after every upgrade as well.

### Windows

Download the latest `.exe` installer from [Releases](https://github.com/JangVincent/coagent-app/releases).

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
| macOS    | No | `brew update && brew upgrade --cask coagent-app` |

macOS auto-update requires code signing, which is not currently configured. Use Homebrew for updates.

## License

MIT
