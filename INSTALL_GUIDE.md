# msdf-bmfont-xml 自动安装 msdfgen 二进制文件

这个项目现在支持在 `npm install` 时自动下载最新版本的 msdfgen 二进制文件。

## 自动安装功能

### 工作原理

1. **自动检测平台**: 脚本会自动检测当前的操作系统和架构
2. **获取最新版本**: 从 GitHub API 获取 `soimy/msdfgen` 仓库的最新 release
3. **下载对应二进制**: 根据平台下载对应的二进制文件到 `bin/` 目录
4. **版本检查**: 如果已存在二进制文件，会检查版本并只在有新版本时更新
5. **设置权限**: 在 Unix 系统上自动设置可执行权限

### 支持的平台

| 平台 | 架构 | 文件路径 |
|------|------|----------|
| macOS | Intel (x64) | `bin/darwin/msdfgen.osx` |
| macOS | Apple Silicon (arm64) | `bin/darwin_arm64/msdfgen.osx` |
| Linux | x64 | `bin/linux/msdfgen.linux` |
| Linux | arm64 | `bin/linux_arm64/msdfgen.linux` |
| Windows | x64/x86 | `bin/win32/msdfgen.exe` |

### 使用方法

#### 正常安装
```bash
npm install msdf-bmfont-xml
```

在安装过程中，会自动下载适合当前平台的 msdfgen 二进制文件。

#### 跳过自动安装
如果你想跳过自动安装（比如你已经有自己的二进制文件），可以设置环境变量：

```bash
SKIP_MSDFGEN_INSTALL=1 npm install msdf-bmfont-xml
```

#### 手动安装/更新
如果你想手动运行安装脚本：

```bash
# 安装完成后，在项目根目录运行
npm run install

# 或者直接运行脚本
node scripts/install-msdfgen.js
```

### 故障排除

#### macOS 安全问题
在 macOS 上，下载的二进制文件可能会被系统的安全机制阻止。安装脚本会自动处理这些问题：

- 移除隔离属性 (quarantine attribute)
- 应用临时代码签名
- 清除可能导致问题的扩展属性

如果仍然遇到安全警告：
1. 打开 **系统偏好设置** > **安全性与隐私**
2. 点击 **仍要打开** 或 **允许**
3. 或使用命令：`sudo spctl --add /path/to/msdfgen`

详细的 macOS 安全处理指南请参考：[macOS 安全指南](docs/MACOS_SECURITY.md)

#### 网络问题
- 确保你的网络可以访问 GitHub API 和下载链接
- 如果遇到速率限制，请稍等几分钟后重试

#### 权限问题
- 确保有权限写入 `bin/` 目录
- 在某些系统上可能需要使用 `sudo`

#### 平台不支持
- 检查你的平台是否在支持列表中
- 如果你的平台不支持，可以手动下载二进制文件并放置到相应目录

#### 代理设置
如果使用代理，确保 Node.js 可以通过代理访问网络：

```bash
npm config set proxy http://your-proxy:port
npm config set https-proxy http://your-proxy:port
```

### 手动安装步骤

如果自动安装失败，你可以手动安装：

1. 访问 [msdfgen releases](https://github.com/soimy/msdfgen/releases/latest)
2. 下载适合你平台的二进制文件
3. 将文件放置到相应的 `bin/` 目录中：
   - macOS Intel: `bin/darwin/msdfgen.osx`
   - macOS Apple Silicon: `bin/darwin_arm64/msdfgen.osx`
   - Linux x64: `bin/linux/msdfgen.linux`
   - Linux ARM64: `bin/linux_arm64/msdfgen.linux`
   - Windows: `bin/win32/msdfgen.exe`
4. 在 Unix 系统上设置可执行权限：`chmod +x bin/*/msdfgen.*`

### 开发者信息

- 安装脚本位置: `scripts/install-msdfgen.js`
- 配置文件: `package.json` 中的 `postinstall` 脚本
- 源码仓库: https://github.com/soimy/msdfgen

### 版本信息

- 自动安装功能会检查已安装的 msdfgen 版本
- 只有在有新版本可用时才会下载更新
- 下载的二进制文件来自官方 GitHub releases

### 贡献

如果你遇到问题或想要改进自动安装功能，欢迎提交 issue 或 pull request。
