# macOS 安全和隐私处理指南

在 macOS 系统上，从网络下载的可执行文件会被 Apple 的 Gatekeeper 和系统隐私保护机制阻止运行。本指南解释了如何处理这些问题。

## 自动处理机制

安装脚本现在包含了以下自动处理步骤：

### 1. 移除隔离属性 (Quarantine Attribute)
```bash
xattr -d com.apple.quarantine /path/to/msdfgen
```

### 2. 清除扩展属性
```bash
xattr -c /path/to/msdfgen
```

### 3. 应用临时代码签名
```bash
codesign --force --deep --sign - /path/to/msdfgen
```

## 如果自动处理失败

如果你仍然遇到安全警告，可以尝试以下手动解决方案：

### 方法 1: 通过系统偏好设置允许
1. 尝试运行 msdfgen 时会弹出安全警告
2. 打开 **系统偏好设置** > **安全性与隐私**
3. 在 **通用** 标签页中，点击 **仍要打开** 或 **允许**
4. 重新运行程序

### 方法 2: 使用终端命令允许
```bash
# 添加到 Gatekeeper 允许列表
sudo spctl --add /path/to/bin/darwin_arm64/msdfgen.osx

# 或者允许特定开发者的所有应用
sudo spctl --add --label "msdfgen" /path/to/bin/darwin_arm64/msdfgen.osx
```

### 方法 3: 临时禁用 Gatekeeper (不推荐)
```bash
# 禁用 Gatekeeper
sudo spctl --master-disable

# 运行程序后记得重新启用
sudo spctl --master-enable
```

### 方法 4: 手动代码签名
如果你有开发者证书：
```bash
codesign --force --sign "Your Developer ID" /path/to/msdfgen
```

## 验证二进制文件状态

### 检查隔离属性
```bash
xattr /path/to/bin/darwin_arm64/msdfgen.osx
```

### 检查代码签名
```bash
codesign -dv /path/to/bin/darwin_arm64/msdfgen.osx
```

### 检查 Gatekeeper 状态
```bash
spctl -a /path/to/bin/darwin_arm64/msdfgen.osx
```

## 常见错误和解决方案

### 错误 1: "msdfgen cannot be opened because the developer cannot be verified"
**解决方案**: 使用方法 1 或 2 允许该应用程序

### 错误 2: "msdfgen is damaged and can't be opened"
**解决方案**: 
1. 运行安装脚本重新下载二进制文件
2. 手动清除隔离属性：`xattr -c /path/to/msdfgen`

### 错误 3: 权限被拒绝
**解决方案**: 
```bash
chmod +x /path/to/bin/darwin_arm64/msdfgen.osx
```

### 错误 4: codesign 失败
**解决方案**: 
1. 确保安装了 Xcode Command Line Tools：`xcode-select --install`
2. 或者跳过代码签名，使用其他方法

## 环境变量控制

### 跳过 macOS 安全处理
```bash
SKIP_MACOS_SECURITY=1 npm install
```

### 跳过整个安装过程
```bash
SKIP_MSDFGEN_INSTALL=1 npm install
```

## 对于企业环境

在企业环境中，IT 管理员可能需要：

1. **预批准应用程序**:
   ```bash
   sudo spctl --add --label "msdfgen" /Applications/msdfgen
   ```

2. **配置 MDM 策略** 允许特定的未签名应用程序

3. **使用企业证书签名**:
   ```bash
   codesign --force --sign "Developer ID Application: Your Company" msdfgen
   ```

## 安全考虑

- 只从可信的源下载二进制文件
- 定期更新到最新版本
- 在生产环境中，考虑使用已验证的代码签名版本
- 避免完全禁用 Gatekeeper，这会降低系统安全性

## 故障排除

如果仍然遇到问题，可以：

1. 查看系统日志：
   ```bash
   log show --predicate 'eventMessage contains "msdfgen"' --last 1h
   ```

2. 检查 Gatekeeper 策略：
   ```bash
   spctl --status
   ```

3. 重置 LaunchServices 数据库：
   ```bash
   /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -kill -r -domain local -domain system -domain user
   ```

## 技术实现细节

安装脚本在 macOS 上会：

1. 下载二进制文件到临时位置
2. 移除任何隔离属性
3. 应用 ad-hoc 代码签名
4. 设置正确的权限 (755)
5. 测试二进制文件是否可执行
6. 如果失败，提供详细的手动解决指导

这种方法确保了大多数用户可以无缝使用下载的二进制文件，同时保持系统安全性。
