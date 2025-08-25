# msdfgen Binary Distribution and Sync Scripts

## Change: Pre-bundled Binaries

All platform binaries for msdfgen are now pre-bundled in the repo (`bin/` directory). When distributed as an npm module, binaries are served via npm's CDN, avoiding GitHub rate limits and download failures.

## Installation Behavior

During `npm install`, no automatic download is performed. The binaries are already present for all supported platforms:

- **macOS**:
  - Intel (x64) → `bin/darwin/msdfgen.osx`
  - Apple Silicon (arm64) → `bin/darwin_arm64/msdfgen.osx`
- **Linux**:
  - x64 → `bin/linux/msdfgen.linux`
  - arm64 → `bin/linux_arm64/msdfgen.linux`
- **Windows**:
  - x64/x86 → `bin/win32/msdfgen.exe`

## Development Scripts

The scripts in `scripts/` (`install-msdfgen.js`, `check-binary.js`) are now only used for development and maintenance. They help synchronize or update msdfgen binaries from upstream, but are not required for end users or during normal installation.

### Usage (for maintainers only)

```bash
# Show help
node scripts/install-msdfgen.js --help

# Sync current platform binary
node scripts/install-msdfgen.js

# Sync all platform binaries
node scripts/install-msdfgen.js --download-all

# Force re-download
node scripts/install-msdfgen.js --force
```

## Troubleshooting

If you encounter issues with the binaries, you can manually resync using the scripts above. For most users, this is not necessary.

## macOS Security Handling

macOS security handling (quarantine removal, code signing, etc.) is still performed automatically during install if needed. See `MACOS_SECURITY.md` for details.

## File Structure

```
bin/
├── darwin/                    # macOS Intel
│   ├── msdfgen.osx
├── darwin_arm64/             # macOS Apple Silicon  
│   ├── msdfgen.osx
├── linux/                    # Linux x64
│   ├── msdfgen.linux
├── linux_arm64/              # Linux ARM64
│   ├── msdfgen.linux
└── win32/                    # Windows
    ├── msdfgen.exe
```
