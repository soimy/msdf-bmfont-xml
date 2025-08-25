
# macOS Security Mechanisms & Solution Summary

## Background

On macOS, executables downloaded from the internet are blocked by Apple's security mechanisms, including:

- **Gatekeeper**: Prevents running unverified apps
- **Quarantine Attribute**: Marks files downloaded from the internet
- **Code Signature Check**: Verifies app integrity and origin

## Automatic Handling & Technical Implementation

The install script includes the following automatic steps:

1. **Remove Quarantine Attribute**

   ```bash
   xattr -d com.apple.quarantine /path/to/msdfgen
   ```

2. **Clear All Extended Attributes**

   ```bash
   xattr -c /path/to/msdfgen
   ```

3. **Apply Temporary Code Signature**

   ```bash
   codesign --force --deep --sign - /path/to/msdfgen
   ```

4. **Set Permissions**

   ```bash
   chmod +x /path/to/msdfgen
   ```

5. **Verification Test**: Test if the binary runs correctly

If automatic repair fails, the script handles errors gracefully and provides detailed manual instructions.

## Manual Solutions

If automatic handling fails or you encounter security warnings, try the following methods:

### Method 1: Allow via System Preferences

1. Attempt to run msdfgen and a security warning will pop up
2. Open **System Preferences** > **Security & Privacy**
3. In the **General** tab, click **Open Anyway** or **Allow**
4. Re-run the program

### Method 2: Allow via Terminal

```bash
# Add to Gatekeeper allow list
sudo spctl --add /path/to/bin/darwin_arm64/msdfgen.osx

# Or allow all apps from a specific developer
sudo spctl --add --label "msdfgen" /path/to/bin/darwin_arm64/msdfgen.osx
```

### Method 3: Temporarily Disable Gatekeeper (Not Recommended)

```bash
# Disable Gatekeeper
sudo spctl --master-disable

# Remember to re-enable after running
sudo spctl --master-enable
```

### Method 4: Manual Code Signing

If you have a developer certificate:

```bash
codesign --force --sign "Your Developer ID" /path/to/msdfgen
```

## Verification & Troubleshooting

### Check Quarantine Attribute

```bash
xattr /path/to/bin/darwin_arm64/msdfgen.osx
```

### Check Code Signature

```bash
codesign -dv /path/to/bin/darwin_arm64/msdfgen.osx
```

### Check Gatekeeper Status

```bash
spctl -a /path/to/bin/darwin_arm64/msdfgen.osx
```

### Common Errors and Solutions

- **Error 1**: "msdfgen cannot be opened because the developer cannot be verified"
  - Solution: Use Method 1 or 2 to allow the app
- **Error 2**: "msdfgen is damaged and can't be opened"
  - Solution: Run the install script to re-download the binary, or manually clear quarantine attribute: `xattr -c /path/to/msdfgen`
- **Error 3**: Permission Denied
  - Solution: `chmod +x /path/to/bin/darwin_arm64/msdfgen.osx`
- **Error 4**: codesign Failed
  - Solution: Make sure Xcode Command Line Tools are installed: `xcode-select --install`, or skip code signing and use other methods

### Other Troubleshooting Methods

1. Check system logs:

   ```bash
   log show --predicate 'eventMessage contains "msdfgen"' --last 1h
   ```

2. Check Gatekeeper policy:

   ```bash
   spctl --status
   ```

3. Reset LaunchServices database:

   ```bash
   /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -kill -r -domain local -domain system -domain user
   ```

## Environment Variable Control

### Skip macOS Security Handling

```bash
SKIP_MACOS_SECURITY=1 npm install
```

### Skip Entire Install Process

```bash
SKIP_MSDFGEN_INSTALL=1 npm install
```

## Enterprise Environment Advice

IT administrators may need to:

1. **Pre-approve Applications**:

   ```bash
   sudo spctl --add --label "msdfgen" /Applications/msdfgen
   ```

2. **Configure MDM Policies** to allow specific unsigned apps
3. **Sign with Enterprise Certificate**:

   ```bash
   codesign --force --sign "Developer ID Application: Your Company" msdfgen
   ```

## Security Considerations

- Only download binaries from trusted sources
- Update regularly to the latest version
- In production, use a verified code-signed version
- Avoid disabling Gatekeeper completely, as it reduces system security
- Least privilege principle: only necessary changes are applied
- All steps are logged, user can choose to skip
- Does not harm system security settings

## User Experience Improvements

- ✅ Most users do not need manual intervention
- ✅ Clear error messages and guidance
- ✅ Compatible with existing workflows
- ✅ Supports enterprise deployment needs

This solution ensures msdf-bmfont-xml works seamlessly on macOS while maintaining system security.
