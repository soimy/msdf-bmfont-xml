#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test binary path
const testBinary = path.join(__dirname, 'test_binary');

/**
 * Remove macOS quarantine attribute and handle Gatekeeper issues
 */
function removeMacOSQuarantine(binaryPath) {
  if (process.platform !== 'darwin') {
    console.log('Not on macOS, skipping quarantine removal');
    return;
  }
  
  try {
    console.log('Removing macOS quarantine attribute...');
    
    // Remove quarantine attribute
    execSync(`xattr -d com.apple.quarantine "${binaryPath}"`, { stdio: 'pipe' });
    console.log('✅ Quarantine attribute removed');
    
  } catch (error) {
    // Quarantine attribute might not exist, which is fine
    console.log('ℹ️  No quarantine attribute found (this is normal)');
  }
  
  try {
    // Clear all extended attributes
    execSync(`xattr -c "${binaryPath}"`, { stdio: 'pipe' });
    console.log('✅ Extended attributes cleared');
    
  } catch (error) {
    console.log('ℹ️  No extended attributes to clear');
  }
  
  try {
    // Sign the binary with ad-hoc signature to bypass some Gatekeeper checks
    console.log('Applying ad-hoc code signature...');
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
    const output = execSync(`"${binaryPath}"`, { encoding: 'utf8', stdio: 'pipe' });
    console.log('✅ Binary is working correctly');
    console.log('Output:', output.trim());
    return true;
  } catch (error) {
    if (process.platform === 'darwin') {
      console.warn('⚠️  Binary execution failed on macOS');
      console.warn('');
      console.warn('🔧 If you see a security warning, please follow these steps:');
      console.warn('1. Open System Preferences > Security & Privacy');
      console.warn('2. Click "Allow" next to the blocked binary');
      console.warn('3. Or run this command in terminal:');
      console.warn(`   sudo spctl --add "${binaryPath}"`);
      console.warn('4. Alternative: Disable Gatekeeper temporarily:');
      console.warn('   sudo spctl --master-disable');
      console.warn('   (Remember to re-enable: sudo spctl --master-enable)');
      console.warn('');
      console.warn('🔄 After allowing the binary, you can test it with:');
      console.warn(`   "${binaryPath}"`);
    } else {
      console.warn('⚠️  Binary may not be working correctly');
    }
    return false;
  }
}

// Run tests
console.log('Testing macOS security handling...');
console.log('Platform:', process.platform);
console.log('Test binary:', testBinary);

if (fs.existsSync(testBinary)) {
  console.log('\n--- Before applying macOS fixes ---');
  testBinaryAndProvideMacOSGuidance(testBinary);
  
  console.log('\n--- Applying macOS security fixes ---');
  removeMacOSQuarantine(testBinary);
  
  console.log('\n--- After applying macOS fixes ---');
  testBinaryAndProvideMacOSGuidance(testBinary);
} else {
  console.error('Test binary not found:', testBinary);
}
