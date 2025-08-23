#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BIN_DIR = path.join(__dirname, '..', 'bin');

function calculateFileHash(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  } catch (error) {
    return null;
  }
}

function checkBinaryStatus() {
  console.log('🔍 Checking msdfgen binary status...\n');
  
  if (!fs.existsSync(BIN_DIR)) {
    console.log('❌ Bin directory not found');
    return;
  }
  
  const platforms = fs.readdirSync(BIN_DIR).filter(item => {
    const itemPath = path.join(BIN_DIR, item);
    return fs.statSync(itemPath).isDirectory();
  });
  
  for (const platform of platforms) {
    const platformDir = path.join(BIN_DIR, platform);
    const metadataFile = path.join(platformDir, '.release-info.json');
    
    console.log(`📁 Platform: ${platform}`);
    
    // Find binary files
    const files = fs.readdirSync(platformDir);
    const binaryFiles = files.filter(f => 
      f.includes('msdfgen') && !f.endsWith('.json') && !f.startsWith('.')
    );
    
    if (binaryFiles.length === 0) {
      console.log('   ❌ No binary found');
      continue;
    }
    
    for (const binaryFile of binaryFiles) {
      const binaryPath = path.join(platformDir, binaryFile);
      const stats = fs.statSync(binaryPath);
      const hash = calculateFileHash(binaryPath);
      
      console.log(`   📄 Binary: ${binaryFile}`);
      console.log(`   📏 Size: ${stats.size} bytes`);
      console.log(`   📅 Modified: ${stats.mtime.toISOString()}`);
      console.log(`   🔐 Hash: ${hash ? hash.substring(0, 16) + '...' : 'N/A'}`);
      
      // Check if executable
      try {
        const { execSync } = require('child_process');
        execSync(`"${binaryPath}" --help`, { stdio: 'pipe' });
        console.log('   ✅ Executable: Yes');
      } catch (error) {
        console.log('   ❌ Executable: No');
      }
    }
    
    // Check metadata
    if (fs.existsSync(metadataFile)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
        console.log(`   📋 Release: ${metadata.tag_name} (ID: ${metadata.release_id})`);
        console.log(`   🎯 Asset: ${metadata.asset_name} (ID: ${metadata.asset_id})`);
        console.log(`   📥 Downloaded: ${metadata.downloaded_at}`);
        console.log(`   🔐 Stored Hash: ${metadata.binary_hash ? metadata.binary_hash.substring(0, 16) + '...' : 'N/A'}`);
        
        // Verify hash matches
        if (binaryFiles.length > 0) {
          const currentHash = calculateFileHash(path.join(platformDir, binaryFiles[0]));
          if (currentHash === metadata.binary_hash) {
            console.log('   ✅ Hash verification: Passed');
          } else {
            console.log('   ⚠️  Hash verification: Failed (file may have been modified)');
          }
        }
      } catch (error) {
        console.log('   ❌ Metadata: Corrupted');
      }
    } else {
      console.log('   ⚠️  Metadata: Not found');
    }
    
    console.log('');
  }
}

function cleanMetadata() {
  console.log('🧹 Cleaning metadata files...\n');
  
  if (!fs.existsSync(BIN_DIR)) {
    console.log('❌ Bin directory not found');
    return;
  }
  
  const platforms = fs.readdirSync(BIN_DIR).filter(item => {
    const itemPath = path.join(BIN_DIR, item);
    return fs.statSync(itemPath).isDirectory();
  });
  
  for (const platform of platforms) {
    const platformDir = path.join(BIN_DIR, platform);
    const metadataFile = path.join(platformDir, '.release-info.json');
    
    if (fs.existsSync(metadataFile)) {
      try {
        fs.unlinkSync(metadataFile);
        console.log(`✅ Removed metadata for ${platform}`);
      } catch (error) {
        console.log(`❌ Failed to remove metadata for ${platform}: ${error.message}`);
      }
    } else {
      console.log(`ℹ️  No metadata found for ${platform}`);
    }
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'clean':
    cleanMetadata();
    break;
  case 'status':
  default:
    checkBinaryStatus();
    break;
}
