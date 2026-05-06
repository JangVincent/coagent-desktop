# Coagent Desktop

**coagent** 데스크톱 앱 — Claude Code 에이전트들과 함께하는 멀티 참가자 채팅.

[English](README.md)

## 사전 준비

coagent를 사용하기 전에 Claude Code CLI 인증이 필요합니다.

### 방법 1: Claude 계정으로 로그인 (권장)

```bash
# Claude Code CLI 설치
npm install -g @anthropic-ai/claude-code

# Claude 계정으로 로그인
claude login
```

### 방법 2: API Key 사용

```bash
# Anthropic API 키를 환경변수로 설정
export ANTHROPIC_API_KEY="sk-ant-api03-..."
```

셸 프로필(`~/.zshrc`, `~/.bashrc` 등)에 추가하면 세션 간에도 유지됩니다.

> 머신당 한 번만 설정하면 됩니다. coagent가 생성하는 에이전트들이 인증된 세션 또는 API 키를 사용합니다.

## 설치

### macOS (Homebrew)

```bash
brew tap JangVincent/tap
brew install --cask coagent-app
```

업데이트할 때는 tap이 최신 포뮬러를 받아오도록 반드시 `brew update`를 먼저 실행하세요:

```bash
brew update && brew upgrade --cask coagent-app
```

### macOS (수동 설치)

[Releases](https://github.com/JangVincent/coagent-app/releases)에서 최신 `.dmg` 파일을 다운로드하고 Applications로 드래그하세요.

> **참고:** Apple Silicon (arm64) 전용. Intel Mac은 지원하지 않습니다.

#### "coagent이(가) 손상되어 열 수 없습니다"

앱이 공증되지 않아 macOS가 첫 실행 시 격리합니다. 격리 속성을 제거하세요:

```bash
sudo xattr -dr com.apple.quarantine /Applications/coagent.app
```

Homebrew와 수동 `.dmg` 설치 모두에 적용됩니다.

### Windows

[Releases](https://github.com/JangVincent/coagent-app/releases)에서 최신 `.exe` 설치 파일을 다운로드하세요.

자동 업데이트가 활성화되어 있어 매시간 업데이트를 확인하고 자동으로 설치합니다.

### Linux

**Debian/Ubuntu:**
```bash
# Releases에서 .deb 파일을 다운로드한 후:
sudo dpkg -i coagent_*.deb
```

**기타 배포판 (AppImage):**
```bash
# Releases에서 .AppImage 파일을 다운로드한 후:
chmod +x coagent-*.AppImage
./coagent-*.AppImage
```

Linux에서도 자동 업데이트가 활성화되어 있습니다.

## 개발

```bash
# 의존성 설치
npm install

# 개발 모드로 실행
npm run dev

# 프로덕션 빌드
npm run build

# 앱 패키징
npm run make
```

## 자동 업데이트

| 플랫폼 | 자동 업데이트 | 방식 |
|--------|---------------|------|
| Windows | 예 | Squirrel + update.electronjs.org |
| Linux | 예 | update.electronjs.org |
| macOS | 아니오 | `brew update && brew upgrade --cask coagent-app` |

macOS 자동 업데이트는 코드 서명이 필요하지만 현재 설정되어 있지 않습니다. Homebrew를 통해 업데이트하세요.

## 라이선스

MIT
