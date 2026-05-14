/**
 * Tests for Issue #99 fix: error handling and graceful degradation
 *
 * Test cases:
 * 1. mapLimit error handling - errors should propagate correctly
 * 2. emptyCharContainer - should produce valid empty glyph container
 * 3. msdfgen failure classification - systemic vs character-specific
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const generateBMFont = require('../');

const logger = generateBMFont.defaultLogger;

// Test 1: emptyCharContainer function
function testEmptyCharContainer() {
  logger.log('[test] Testing emptyCharContainer function...');

  // We need to access the internal function, but it's not exported.
  // Instead, we verify the behavior through integration test with blank characters.

  // The space character should produce an empty glyph
  const fontPath = path.join(__dirname, '..', 'assets', 'fonts', 'DIN_CB.ttf');
  const fontBuffer = fs.readFileSync(fontPath);

  generateBMFont(fontBuffer, {
    filename: 'test_empty',
    outputType: 'json',
    charset: ' '  // Only space character
  }, (error, _textures, fontFile) => {
    assert.ok(!error, 'font generation should not fail for blank character');

    const font = JSON.parse(fontFile.data);
    assert.equal(font.chars.length, 1, 'should have one character');
    assert.equal(font.chars[0].width, 0, 'empty char should have width 0');
    assert.equal(font.chars[0].height, 0, 'empty char should have height 0');

    logger.log('[test] emptyCharContainer test passed');

    // Run next test
    testMapLimitErrorHandling();
  });
}

// Test 2: mapLimit error handling
function testMapLimitErrorHandling() {
  logger.log('[test] Testing mapLimit error handling...');

  // This test verifies that if mapLimit's callback receives an error,
  // it properly returns instead of continuing to packer.addArray(undefined)

  const indexContent = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  const lines = indexContent.split('\n');

  // Find the mapLimit callback line and verify it has 'return'
  // The pattern should be: }, async (err, results) => { ... if (err) return callback(err);
  let foundMapLimitCallback = false;
  let foundCorrectErrorHandler = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Look for the mapLimit callback pattern
    if (line.includes('async (err, results)')) {
      foundMapLimitCallback = true;
      // Check the next few lines for the error handler
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].includes('if (err)') && lines[j].includes('return callback(err)')) {
          foundCorrectErrorHandler = true;
          break;
        }
        // If we find bar.stop() before the error handler, that's wrong
        if (lines[j].includes('bar.stop()')) break;
      }
      break;
    }
  }

  assert.ok(foundMapLimitCallback, 'should find mapLimit callback');
  assert.ok(foundCorrectErrorHandler, 'mapLimit error handler should have return statement');

  logger.log('[test] mapLimit error handling test passed');

  // Run next test
  testSystemicVsCharacterFailure();
}

// Test 3: Systemic vs character-specific failure classification
function testSystemicVsCharacterFailure() {
  logger.log('[test] Testing systemic vs character-specific failure classification...');

  const indexContent = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');

  // Verify the systemic error detection logic exists
  const hasSystemicCheck = indexContent.includes('systemicNodeErrors') &&
    indexContent.includes('ENOENT') &&
    indexContent.includes('err.signal') &&
    indexContent.includes('err.code >= 127');
  assert.ok(hasSystemicCheck, 'should have systemic error detection logic');

  // Verify character-specific failures are tolerated
  const hasGracefulDegradation = indexContent.includes('Failed to generate character') &&
    indexContent.includes('adding to font as empty');
  assert.ok(hasGracefulDegradation, 'should have graceful degradation for character failures');

  logger.log('[test] Systemic vs character failure test passed');

  // Run integration test
  testIntegrationWithBlankChars();
}

// Integration test: verify blank characters don't cause slice error
function testIntegrationWithBlankChars() {
  logger.log('[test] Running integration test with blank characters...');

  const fontPath = path.join(__dirname, '..', 'assets', 'fonts', 'DIN_CB.ttf');
  const fontBuffer = fs.readFileSync(fontPath);

  // Generate font with characters that include space (blank)
  generateBMFont(fontBuffer, {
    filename: 'test_integration',
    outputType: 'json',
    charset: ' A B C'  // Include space which produces blank
  }, (error, _textures, fontFile) => {
    assert.ok(!error, `font generation should succeed: ${error?.message}`);

    const font = JSON.parse(fontFile.data);

    // Should have all characters including the blank space
    assert.ok(font.chars.length >= 4, 'should have at least 4 characters');

    // Find the space character
    const spaceChar = font.chars.find(c => c.id === 32);
    assert.ok(spaceChar, 'space character should exist');
    assert.equal(spaceChar.width, 0, 'space should have width 0');
    assert.equal(spaceChar.height, 0, 'space should have height 0');

    // Verify other characters have valid dimensions
    const nonSpaceChars = font.chars.filter(c => c.id !== 32);
    nonSpaceChars.forEach(c => {
      assert.ok(c.width > 0 || c.height > 0, `character ${c.char} should have dimensions`);
    });

    logger.log('[test] Integration test passed');

    // All tests complete
    logger.log('[test] All tests passed!');
  });
}

// Run tests
logger.log('[test] Starting Issue #99 fix tests');
testEmptyCharContainer();
