#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing install-msdfgen.js new features...\n');

// Test 1: Help option
console.log('1️⃣ Testing help option...');
try {
  const output = execSync('node scripts/install-msdfgen.js --help', { encoding: 'utf8' });
  console.log('✅ Help option works');
  console.log('📋 Output preview:', output.split('\n')[0]);
} catch (error) {
  console.log('❌ Help option failed:', error.message);
}

// Test 2: Verify hash with no binaries
console.log('\n2️⃣ Testing verify hash with no binaries...');
try {
  // Clean up first
  if (fs.existsSync('bin')) {
    execSync('rm -rf bin', { stdio: 'inherit' });
  }
  
  const output = execSync('node scripts/install-msdfgen.js --verify-hash', { encoding: 'utf8' });
  console.log('✅ Verify hash works with no binaries');
  const lines = output.split('\n');
  const summaryLine = lines.find(line => line.includes('Found binaries:'));
  console.log('📋', summaryLine);
} catch (error) {
  console.log('❌ Verify hash failed:', error.message);
}

// Test 3: Install for current platform
console.log('\n3️⃣ Testing install for current platform...');
try {
  execSync('node scripts/install-msdfgen.js', { stdio: 'inherit' });
  console.log('✅ Current platform installation works');
} catch (error) {
  console.log('❌ Current platform installation failed:', error.message);
}

// Test 4: Verify hash with existing binary
console.log('\n4️⃣ Testing verify hash with existing binary...');
try {
  const output = execSync('node scripts/install-msdfgen.js --verify-hash', { encoding: 'utf8' });
  console.log('✅ Verify hash works with existing binaries');
  const lines = output.split('\n');
  const summaryLine = lines.find(line => line.includes('Found binaries:'));
  console.log('📋', summaryLine);
} catch (error) {
  console.log('❌ Verify hash with existing binaries failed:', error.message);
}

// Test 5: Download all platforms
console.log('\n5️⃣ Testing download all platforms...');
try {
  const output = execSync('node scripts/install-msdfgen.js --download-all', { encoding: 'utf8', timeout: 120000 });
  console.log('✅ Download all platforms works');
  const lines = output.split('\n');
  const successfulLine = lines.find(line => line.includes('✅ Successful:'));
  console.log('📋', successfulLine);
} catch (error) {
  console.log('❌ Download all platforms failed:', error.message);
}

// Test 6: Combined options
console.log('\n6️⃣ Testing combined options (-a -v)...');
try {
  const output = execSync('node scripts/install-msdfgen.js -a -v', { encoding: 'utf8', timeout: 120000 });
  console.log('✅ Combined options work');
  // Count verification sections
  const verificationSections = (output.match(/🔍 Verifying/g) || []).length;
  console.log('📋 Found verification sections:', verificationSections);
} catch (error) {
  console.log('❌ Combined options failed:', error.message);
}

// Test 7: Check binary structure
console.log('\n7️⃣ Testing binary structure...');
try {
  if (fs.existsSync('bin')) {
    const platforms = fs.readdirSync('bin').filter(dir => 
      fs.statSync(path.join('bin', dir)).isDirectory()
    );
    console.log('✅ Binary structure looks good');
    console.log('📋 Found platforms:', platforms.join(', '));
    
    // Check for metadata files
    const metadataFiles = platforms.filter(platform => 
      fs.existsSync(path.join('bin', platform, '.release-info.json'))
    );
    console.log('📋 Platforms with metadata:', metadataFiles.join(', '));
  } else {
    console.log('❌ No bin directory found');
  }
} catch (error) {
  console.log('❌ Binary structure check failed:', error.message);
}

console.log('\n🎉 Feature testing complete!');
console.log('\n📚 Usage examples:');
console.log('  node scripts/install-msdfgen.js --help');
console.log('  node scripts/install-msdfgen.js --verify-hash');
console.log('  node scripts/install-msdfgen.js --download-all');
console.log('  node scripts/install-msdfgen.js -a -v');
