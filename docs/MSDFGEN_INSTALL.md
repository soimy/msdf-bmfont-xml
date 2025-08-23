# msdfgen 二进制自动下载

这个脚本会在 `npm install` 时自动从 GitHub 下载最新版本的 msdfgen 二进制文件。

## 工作原理

1. **自动检测平台**: 脚本会自动检测当前的操作系统和架构
2. **获取最新版本**: 从 GitHub API 获取 soimy/msdfgen 仓库的最新 release
3. **下载对应二进制**: 根据平台下载对应的二进制文件到 `bin/` 目录
4. **设置权限**: 在 Unix 系统上自动设置可执行权限

## 支持的平台

- **macOS**: 
  - Intel (x64) → `bin/darwin/msdfgen.osx`
  - Apple Silicon (arm64) → `bin/darwin_arm64/msdfgen.osx`
- **Linux**:
  - x64 → `bin/linux/msdfgen.linux`
  - arm64 → `bin/linux_arm64/msdfgen.linux`
- **Windows**:
  - x64/x86 → `bin/win32/msdfgen.exe`

## 手动安装

如果自动安装失败，你可以手动运行安装脚本：

```bash
node scripts/install-msdfgen.js
```

## 跳过自动安装

如果你想跳过自动安装（比如你已经有自己的二进制文件），可以设置环境变量：

```bash
SKIP_MSDFGEN_INSTALL=1 npm install
```

## 故障排除

1. **网络问题**: 确保你的网络可以访问 GitHub API 和下载链接
2. **权限问题**: 确保有权限写入 `bin/` 目录
3. **平台不支持**: 检查你的平台是否在支持列表中
4. **代理设置**: 如果使用代理，确保 Node.js 可以通过代理访问网络

## 文件结构

```
bin/
├── darwin/           # macOS Intel
│   └── msdfgen.osx
├── darwin_arm64/     # macOS Apple Silicon  
│   └── msdfgen.osx
├── linux/            # Linux x64
│   └── msdfgen.linux
├── linux_arm64/      # Linux ARM64
│   └── msdfgen.linux
└── win32/            # Windows
    └── msdfgen.exe
```
