#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');
const crypto = require('crypto');

// Command line options
const args = process.argv.slice(2);
const options = {
  downloadAll: args.includes('--download-all') || args.includes('-a'),
  force: args.includes('--force') || args.includes('-f'),
  help: args.includes('--help') || args.includes('-h')
};

// GitHub repository information
const REPO_OWNER = 'soimy';
const REPO_NAME = 'msdfgen';
const BIN_DIR = path.join(__dirname, '..', 'bin');

// Platform mapping
const platformMapping = {
  'darwin': {
    'x64': 'darwin',
    'arm64': 'darwin_arm64'
  },
  'linux': {
    'x64': 'linux',
    'arm64': 'linux_arm64'
  },
  'win32': {
    'x64': 'win32',
    'ia32': 'win32'
  }
};

const binaryNames = {
  'darwin': 'msdfgen.osx',
  'darwin_arm64': 'msdfgen.osx',
  'linux': 'msdfgen.linux',
  'linux_arm64': 'msdfgen.linux',
  'win32': 'msdfgen.exe'
};

/**
 * Show help information
 */
function showHelp() {
  console.log(`
Usage: node install-msdfgen.js [options]

Options:
  -h, --help         Show this help message
  -a, --download-all Download binaries for all supported platforms
  -f, --force        Force download without hash verification

Examples:
  node install-msdfgen.js                    # Install binary for current platform (with hash check)
  node install-msdfgen.js --download-all     # Download all platform binaries (with hash check)
  node install-msdfgen.js --force            # Force download current platform binary
  node install-msdfgen.js -a -f              # Force download all platform binaries
`);
}

/**
 * Calculate SHA256 hash of a file
 */
function calculateFileHash(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  } catch (error) {
    console.warn(`Could not calculate hash for ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Get stored release metadata for a binary
 */
function getStoredReleaseInfo(binaryPath) {
  const platformDir = path.dirname(binaryPath);
  const metadataFile = path.join(platformDir, '.release-info.json');
  
  try {
    if (fs.existsSync(metadataFile)) {
      const data = fs.readFileSync(metadataFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn(`Could not read release metadata: ${error.message}`);
  }
  
  return null;
}

/**
 * Store release metadata for a binary
 */
function storeReleaseInfo(binaryPath, releaseData, assetData) {
  const platformDir = path.dirname(binaryPath);
  const metadataFile = path.join(platformDir, '.release-info.json');
  
  // Ensure directory exists
  if (!fs.existsSync(platformDir)) {
    fs.mkdirSync(platformDir, { recursive: true });
  }
  
  const metadata = {
    release_id: releaseData.id,
    tag_name: releaseData.tag_name,
    published_at: releaseData.published_at,
    asset_id: assetData.id,
    asset_name: assetData.name,
    asset_url: assetData.browser_download_url,
    downloaded_at: new Date().toISOString(),
    binary_hash: calculateFileHash(binaryPath)
  };
  
  try {
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
    console.log(`📝 Stored release metadata: ${metadataFile}`);
  } catch (error) {
    console.warn(`Could not store release metadata: ${error.message}`);
  }
}

/**
 * Check if we need to update based on release info and file hash
 */
function needsUpdate(binaryPath, latestRelease, targetAsset, platformKey, force = false) {
  // If force download is requested, always download
  if (force) {
    console.log('💪 Force download requested');
    return true;
  }
  
  // If binary doesn't exist, we need to download
  if (!fs.existsSync(binaryPath)) {
    console.log('📥 Binary not found, will download');
    return true;
  }
  
  // Get stored metadata
  const storedInfo = getStoredReleaseInfo(binaryPath);
  if (!storedInfo) {
    console.log('📥 No release metadata found, will download to ensure latest version');
    return true;
  }
  
  // Check if it's a different release
  if (storedInfo.release_id !== latestRelease.id) {
    console.log(`📦 New release detected (${storedInfo.tag_name} → ${latestRelease.tag_name})`);
    return true;
  }
  
  // Check if it's a different asset (in case assets were updated)
  if (storedInfo.asset_id !== targetAsset.id) {
    console.log(`📦 Asset updated for same release`);
    return true;
  }
  
  // Verify file integrity by comparing hash
  const currentHash = calculateFileHash(binaryPath);
  if (!currentHash || currentHash !== storedInfo.binary_hash) {
    console.log('🔍 Binary file hash mismatch, will re-download');
    return true;
  }
  
  // Test if binary is actually working (only for current platform)
  const currentPlatform = getCurrentPlatform();
  if (platformKey === currentPlatform) {
    try {
      execSync(`"${binaryPath}" --help`, { stdio: 'pipe' });
      console.log('✅ Binary is up-to-date and working');
    } catch (error) {
      console.log('⚠️  Binary exists but not working, will re-download');
      return true;
    }
  } else {
    console.log('✅ Binary file is up-to-date (hash verified)');
  }
  
  return false;
}

/**
 * Make an HTTPS request and return the response
 */
function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      headers: {
        'User-Agent': 'msdf-bmfont-xml-installer',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      
      if (res.statusCode === 302 || res.statusCode === 301) {
        // Follow redirect
        return httpsRequest(res.headers.location, options).then(resolve).catch(reject);
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }
      
      if (options.binary) {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      } else {
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      }
    });
    
    req.on('error', reject);
    req.end();
  });
}

/**
 * Get the latest release information from GitHub
 */
async function getLatestRelease() {
  console.log('🔍 Fetching latest release information...');
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
  const release = await httpsRequest(url);
  console.log(`📋 Latest release: ${release.tag_name} (ID: ${release.id})`);
  return release;
}

/**
 * Download a file from URL to local path
 */
async function downloadFile(url, localPath) {
  console.log(`⬇️  Downloading ${path.basename(localPath)}...`);
  const data = await httpsRequest(url, { binary: true });
  
  // Ensure directory exists
  const dir = path.dirname(localPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(localPath, data);
  
  // Make executable on Unix-like systems
  if (process.platform !== 'win32') {
    fs.chmodSync(localPath, 0o755);
  }
  
  console.log(`✅ Downloaded: ${localPath}`);
  
  // Calculate and log hash for verification
  const hash = calculateFileHash(localPath);
  if (hash) {
    console.log(`🔐 File hash: ${hash.substring(0, 16)}...`);
  }
}

/**
 * Get the current platform identifier
 */
function getCurrentPlatform() {
  const platform = os.platform();
  const arch = os.arch();
  
  if (!platformMapping[platform] || !platformMapping[platform][arch]) {
    throw new Error(`Unsupported platform: ${platform}-${arch}`);
  }
  
  return platformMapping[platform][arch];
}

/**
 * Find the appropriate asset for the current platform
 */
function findAssetForPlatform(assets, platformKey) {
  const binaryName = binaryNames[platformKey];
  const expectedName = binaryName.replace(/\.(osx|linux|exe)$/, '');
  
  // Look for assets that match the platform
  for (const asset of assets) {
    const name = asset.name.toLowerCase();
    
    if (platformKey === 'darwin' || platformKey === 'darwin_arm64') {
      if (name.includes('macos') || name.includes('darwin') || name.includes('osx')) {
        if (platformKey === 'darwin_arm64' && (name.includes('arm64') || name.includes('aarch64'))) {
          return asset;
        } else if (platformKey === 'darwin' && (name.includes('x64') || name.includes('x86_64') || (!name.includes('arm') && !name.includes('aarch')))) {
          return asset;
        }
      }
    } else if (platformKey.startsWith('linux')) {
      if (name.includes('linux')) {
        if (platformKey === 'linux_arm64' && (name.includes('arm64') || name.includes('aarch64'))) {
          return asset;
        } else if (platformKey === 'linux' && (name.includes('x64') || name.includes('x86_64') || (!name.includes('arm') && !name.includes('aarch')))) {
          return asset;
        }
      }
    } else if (platformKey === 'win32') {
      if (name.includes('windows') || name.includes('win32') || name.includes('win64')) {
        return asset;
      }
    }
  }
  
  return null;
}

/**
 * Remove macOS quarantine attribute and handle Gatekeeper issues
 */
function removeMacOSQuarantine(binaryPath) {
  if (process.platform !== 'darwin') {
    return;
  }
  
  try {
    console.log('🍎 Removing macOS quarantine attribute...');
    
    // Remove quarantine attribute
    execSync(`xattr -d com.apple.quarantine "${binaryPath}"`, { stdio: 'pipe' });
    console.log('✅ Quarantine attribute removed');
    
    // Try to remove any extended attributes that might cause issues
    execSync(`xattr -c "${binaryPath}"`, { stdio: 'pipe' });
    
  } catch (error) {
    // Quarantine attribute might not exist, which is fine
    console.log('ℹ️  No quarantine attribute found (this is normal)');
  }
  
  try {
    // Sign the binary with ad-hoc signature to bypass some Gatekeeper checks
    console.log('🔏 Applying ad-hoc code signature...');
    execSync(`codesign --force --deep --sign - "${binaryPath}"`, { stdio: 'pipe' });
    console.log('✅ Ad-hoc code signature applied');
    
  } catch (error) {
    console.warn('⚠️  Could not apply code signature (codesign might not be available)');
    console.warn('You may need to manually allow the binary in System Preferences > Security & Privacy');
  }
}

/**
 * Test binary execution and provide macOS-specific guidance if needed
 */
function testBinaryAndProvideMacOSGuidance(binaryPath) {
  try {
    execSync(`"${binaryPath}" --help`, { stdio: 'pipe' });
    console.log('✅ Binary is working correctly');
    return true;
  } catch (error) {
    if (process.platform === 'darwin') {
      console.warn('⚠️  Binary execution failed on macOS');
      console.warn('');
      console.warn('🔧 If you see a security warning, please follow these steps:');
      console.warn('1. Open System Preferences > Security & Privacy');
      console.warn('2. Click "Allow" next to the blocked msdfgen binary');
      console.warn('3. Or run this command in terminal:');
      console.warn(`   sudo spctl --add "${binaryPath}"`);
      console.warn('4. Alternative: Disable Gatekeeper temporarily:');
      console.warn('   sudo spctl --master-disable');
      console.warn('   (Remember to re-enable: sudo spctl --master-enable)');
      console.warn('');
      console.warn('🔄 After allowing the binary, you can test it with:');
      console.warn(`   "${binaryPath}" --help`);
    } else {
      console.warn('⚠️  Binary may not be working correctly, but installation completed');
    }
    return false;
  }
}

/**
 * Extract binary from downloaded archive if needed
 */
async function extractBinary(downloadPath, platformKey, targetPath) {
  const ext = path.extname(downloadPath).toLowerCase();
  const binaryName = binaryNames[platformKey];
  
  if (ext === '.zip') {
    // Handle zip files
    console.log('📦 Extracting from zip archive...');
    try {
      // Try using system unzip command
      execSync(`unzip -j "${downloadPath}" "*${binaryName.replace(/\.(osx|linux|exe)$/, '')}*" -d "${path.dirname(targetPath)}"`, { stdio: 'inherit' });
      
      // Find the extracted file and rename it
      const dir = path.dirname(targetPath);
      const files = fs.readdirSync(dir);
      const extractedFile = files.find(f => f.includes(binaryName.replace(/\.(osx|linux|exe)$/, '')) || f.includes('msdfgen'));
      
      if (extractedFile) {
        const extractedPath = path.join(dir, extractedFile);
        if (extractedPath !== targetPath) {
          fs.renameSync(extractedPath, targetPath);
        }
      }
    } catch (error) {
      console.warn('Could not extract zip file automatically.');
      console.warn('Please extract manually and place the msdfgen binary at:', targetPath);
      throw error;
    }
  } else if (ext === '.tar' || ext === '.gz' || downloadPath.includes('.tar.gz') || downloadPath.includes('.tgz')) {
    // Handle tar files
    console.log('📦 Extracting from tar archive...');
    try {
      const extractDir = path.dirname(targetPath);
      execSync(`tar -xf "${downloadPath}" -C "${extractDir}"`, { stdio: 'inherit' });
      
      // Find extracted binary
      const findBinary = (dir) => {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stat = fs.statSync(itemPath);
          if (stat.isDirectory()) {
            const found = findBinary(itemPath);
            if (found) return found;
          } else if (item.includes('msdfgen') && !item.includes('.tar') && !item.includes('.gz')) {
            return itemPath;
          }
        }
        return null;
      };
      
      const extractedBinary = findBinary(extractDir);
      if (extractedBinary && extractedBinary !== targetPath) {
        fs.renameSync(extractedBinary, targetPath);
      }
      
    } catch (error) {
      console.warn('Could not extract tar file automatically.');
      console.warn('Please extract manually and place the msdfgen binary at:', targetPath);
      throw error;
    }
  } else {
    // Assume it's a direct binary file
    if (downloadPath !== targetPath) {
      fs.renameSync(downloadPath, targetPath);
    }
  }
  
  // Clean up downloaded archive if it's different from target
  if (downloadPath !== targetPath && fs.existsSync(downloadPath)) {
    try {
      fs.unlinkSync(downloadPath);
    } catch (error) {
      console.warn('Could not clean up downloaded file:', downloadPath);
    }
  }
}

/**
 * Main installation function
 */
async function installMsdfgen(force = false) {
  // Check if installation should be skipped
  if (process.env.SKIP_MSDFGEN_INSTALL) {
    console.log('⏭️  Skipping msdfgen installation (SKIP_MSDFGEN_INSTALL is set)');
    return;
  }

  try {
    console.log('🚀 Installing msdfgen binary...');
    
    // Get current platform
    const platformKey = getCurrentPlatform();
    console.log(`🖥️  Detected platform: ${platformKey}`);
    
    return await installMsdfgenForPlatform(platformKey, force);
    
  } catch (error) {
    console.error('❌ Installation failed:', error.message);
    console.error('You may need to manually download the msdfgen binary from:');
    console.error(`https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/latest`);
    // Don't exit with error code to prevent npm install from failing
    // process.exit(1);
  }
}

/**
 * Install msdfgen binary for a specific platform
 */
async function installMsdfgenForPlatform(platformKey, force = false) {
  console.log(`📦 Installing for platform: ${platformKey}`);
  
  // Setup paths
  const platformDir = path.join(BIN_DIR, platformKey);
  const binaryName = binaryNames[platformKey];
  const targetPath = path.join(platformDir, binaryName);
  
  // Get latest release information
  const release = await getLatestRelease();
  
  // Find appropriate asset
  const asset = findAssetForPlatform(release.assets, platformKey);
  if (!asset) {
    throw new Error(`No suitable binary found for platform: ${platformKey}`);
  }
  
  console.log(`🎯 Target asset: ${asset.name} (ID: ${asset.id})`);
  
  // Check if we need to update using release ID and file hash comparison
  if (!needsUpdate(targetPath, release, asset, platformKey, force)) {
    console.log(`✅ ${platformKey} binary is already up-to-date`);
    return targetPath; // Already up to date
  }
  
  // Prepare download
  const downloadPath = path.join(platformDir, asset.name);
  
  // Download the asset
  await downloadFile(asset.browser_download_url, downloadPath);
  
  // Extract if needed and move to final location
  if (downloadPath !== targetPath) {
    await extractBinary(downloadPath, platformKey, targetPath);
  }
  
  // Verify the binary exists and is executable
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Binary not found at expected location: ${targetPath}`);
  }
  
  // Make executable on Unix-like systems
  if (process.platform !== 'win32') {
    fs.chmodSync(targetPath, 0o755);
  }
  
  console.log(`✅ Successfully installed msdfgen binary: ${targetPath}`);
  
  // Handle macOS security issues (only for current platform)
  if (process.platform === 'darwin' && platformKey.startsWith('darwin')) {
    removeMacOSQuarantine(targetPath);
  }
  
  // Store release metadata for future comparisons
  storeReleaseInfo(targetPath, release, asset);
  
  // Test the binary with platform-specific guidance (only for current platform)
  if (platformKey === getCurrentPlatform()) {
    testBinaryAndProvideMacOSGuidance(targetPath);
  }
  
  return targetPath;
}

/**
 * Install msdfgen binaries for all supported platforms
 */
async function installAllPlatforms(force = false) {
  console.log('🌐 Installing msdfgen binaries for all platforms...');
  
  // Get unique platform keys to avoid duplicates
  const allPlatforms = [...new Set(Object.values(platformMapping).flatMap(Object.values))];
  const results = [];
  
  for (const platformKey of allPlatforms) {
    try {
      console.log(`\n📦 Processing ${platformKey}...`);
      const binaryPath = await installMsdfgenForPlatform(platformKey, force);
      results.push({ platform: platformKey, success: true, path: binaryPath });
    } catch (error) {
      console.error(`❌ Failed to install for ${platformKey}: ${error.message}`);
      results.push({ platform: platformKey, success: false, error: error.message });
    }
  }
  
  // Summary
  console.log('\n📊 Installation Summary:');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}`);
  successful.forEach(r => console.log(`  - ${r.platform}: ${r.path}`));
  
  if (failed.length > 0) {
    console.log(`❌ Failed: ${failed.length}`);
    failed.forEach(r => console.log(`  - ${r.platform}: ${r.error}`));
  }
  
  return results;
}

/**
 * Main entry point when script is run directly
 */
async function main() {
  // Handle help option first
  if (options.help) {
    showHelp();
    return;
  }
  
  try {
    // Handle download all option
    if (options.downloadAll) {
      const results = await installAllPlatforms(options.force);
      
      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        process.exit(1);
      }
      return;
    }
    
    // Default behavior: install for current platform only
    await installMsdfgen(options.force);
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  installMsdfgen,
  installMsdfgenForPlatform,
  installAllPlatforms,
  getCurrentPlatform,
  calculateFileHash
};
