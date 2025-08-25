# msdfgen 二进制分发与同步脚本

## 变更：预置二进制文件

所有平台的 msdfgen 二进制文件现已预置在仓库（`bin/` 目录）。作为 npm 模块分发时，二进制文件通过 npm 的 CDN 提供，避免了 GitHub 流量限制和下载失败。

## 安装行为

在执行 `npm install` 时，不会自动下载二进制文件。所有支持平台的二进制文件已包含在包内：

- **macOS**：
  - Intel (x64) → `bin/darwin/msdfgen.osx`
  - Apple Silicon (arm64) → `bin/darwin_arm64/msdfgen.osx`
- **Linux**：
  - x64 → `bin/linux/msdfgen.linux`
  - arm64 → `bin/linux_arm64/msdfgen.linux`
- **Windows**：
  - x64/x86 → `bin/win32/msdfgen.exe`

## 开发脚本

`scripts/` 目录下的脚本（`install-msdfgen.js`, `check-binary.js`）现仅用于开发和维护。它们用于从上游同步或更新 msdfgen 二进制文件，普通用户或常规安装无需使用。

### 用法（仅维护者使用）

```bash
# 显示帮助
node scripts/install-msdfgen.js --help

# 同步当前平台二进制
node scripts/install-msdfgen.js

# 同步所有平台二进制
node scripts/install-msdfgen.js --download-all

# 强制重新下载
node scripts/install-msdfgen.js --force
```

## 故障排查

如遇二进制相关问题，可使用上述脚本手动重新同步。大多数用户无需此操作。

## macOS 安全处理

macOS 的安全处理（隔离属性移除、代码签名等）在安装时仍会自动执行（如有需要）。详情见 `MACOS_SECURITY.md`。

## 文件结构

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
