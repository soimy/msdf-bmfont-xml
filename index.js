const utils = require('./lib/utils');
const reshaper = require('arabic-persian-reshaper').ArabicShaper;
const opentype = require('opentype.js');
const exec = require('child_process').exec;
const mapLimit = require('map-limit');
const MaxRectsPacker = require('maxrects-packer').MaxRectsPacker;
const path = require('path');
const ProgressBar = require('cli-progress');
const fs = require('fs');
const buffer = require('buffer').Buffer;
const Jimp = require('jimp');
const readline = require('readline');
const assert = require('assert');

const defaultCharset = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~".split('');
const controlChars = ['\n', '\r', '\t'];

const binaryLookup = {
  darwin: 'msdfgen.osx',
  darwin_arm64: 'msdfgen.osx',
  win32: 'msdfgen.exe',
  linux: 'msdfgen.linux',
  linux_arm64: 'msdfgen.linux'
};

module.exports = generateBMFont;

/**
 * Creates a BMFont compatible bitmap font of signed distance fields from a font file
 *
 * @param {string|Buffer} fontPath - Path or Buffer for the input ttf/otf/woff font
 * @param {Object} opt - Options object for generating bitmap font (Optional) :
 *            outputType : font file format Avaliable: xml(default), json, txt
 *            filename : filename of both font file and font textures
 *            fontSize : font size for generated textures (default 42)
 *            charset : charset in generated font, could be array or string (default is Western)
 *            textureWidth : Width of generated textures (default 512)
 *            textureHeight : Height of generated textures (default 512)
 *            distanceRange : distance range for computing signed distance field
 *            fieldType : "msdf"(default), "sdf", "psdf"
 *            roundDecimal  : rounded digits of the output font file. (Defaut is null)
 *            smartSize : shrink atlas to the smallest possible square (Default: false)
 *            pot : atlas size shall be power of 2 (Default: false)
 *            square : atlas size shall be square (Default: false)
 *            rot : allow 90-degree rotation while packing (Default: false)
 *            rtl : use RTL charators fix (Default: false)
 * @param {function(string, Array.<Object>, Object)} callback - Callback funtion(err, textures, font)
 *
 */
function generateBMFont (fontPath, opt, callback) {
  if (typeof opt === 'function') {
    callback = opt;
    opt = {};
  }

  const lookupKey = process.arch === "arm64" ?`${process.platform}_${process.arch}` : process.platform;

  const binName = binaryLookup[lookupKey];

  assert.ok(binName, `No msdfgen binary for platform ${lookupKey}.`);
  assert.ok(fontPath, 'must specify a font path');
  assert.ok(typeof fontPath === 'string' || fontPath instanceof Buffer, 'font must be string path or Buffer');
  assert.ok(opt.filename || !(fontPath instanceof Buffer), 'must specify filename if font is a Buffer');
  assert.ok(callback, 'missing callback')
  assert.ok(typeof callback === 'function', 'expected callback to be a function');
  assert.ok(!opt.textureSize || opt.textureSize.length === 2, 'textureSize format shall be: width,height');

  // Set fallback output path to font path
  let fontDir = typeof fontPath === 'string' ? path.dirname(fontPath) : '';
  const binaryPath = path.join(__dirname, 'bin', process.platform, binName);

  // const reuse = (typeof opt.reuse === 'boolean' || typeof opt.reuse === 'undefined') ? {} : opt.reuse.opt;
  let reuse, cfg = {};
  if (typeof opt.reuse !== 'undefined' && typeof opt.reuse !== 'boolean') {
    if (!fs.existsSync(opt.reuse)) {
      console.log('Creating cfg file : ' + opt.reuse);
      reuse = {};
    } else {
      console.log('Loading cfg file : ' + opt.reuse);
      cfg = JSON.parse(fs.readFileSync(opt.reuse, 'utf8'));
      reuse = cfg.opt;
    }
  } else reuse = {};
  const outputType = opt.outputType = utils.valueQueue([opt.outputType, reuse.outputType, "xml"]);
  let filename = utils.valueQueue([opt.filename, reuse.filename]);
  const distanceRange = opt.distanceRange = utils.valueQueue([opt.distanceRange, reuse.distanceRange, 4]);
  const fontSize = opt.fontSize = utils.valueQueue([opt.fontSize, reuse.fontSize, 42]);
  const fontSpacing = opt.fontSpacing = utils.valueQueue([opt.fontSpacing, reuse.fontSpacing, [0, 0]]);
  const pad = distanceRange >> 1;
  const fontPadding = opt.fontPadding = utils.valueQueue([opt.fontPadding, reuse.fontPadding, [pad, pad, pad, pad]]);
  const textureWidth = opt.textureWidth = utils.valueQueue([opt.textureSize || reuse.textureSize, [512, 512]])[0];
  const textureHeight = opt.textureHeight = utils.valueQueue([opt.textureSize || reuse.textureSize, [512, 512]])[1];
  const texturePadding = opt.texturePadding = utils.valueQueue([opt.texturePadding, reuse.texturePadding, 1]);
  const border = opt.border = utils.valueQueue([opt.border, reuse.border, 0]);
  const fieldType = opt.fieldType = utils.valueQueue([opt.fieldType, reuse.fieldType, 'msdf']);
  const roundDecimal = opt.roundDecimal = utils.valueQueue([opt.roundDecimal, reuse.roundDecimal]); // if no roudDecimal option, left null as-is
  const smartSize = opt.smartSize = utils.valueQueue([opt.smartSize, reuse.smartSize, false]);
  const pot = opt.pot = utils.valueQueue([opt.pot, reuse.pot, false]);
  const square = opt.square = utils.valueQueue([opt.square, reuse.square, false]);
  const debug = opt.vector || false;
  const tolerance = opt.tolerance = utils.valueQueue([opt.tolerance, reuse.tolerance, 0]);
  const isRTL = opt.rtl = utils.valueQueue([opt.rtl, reuse.rtl, false]);
  const allowRotation = opt.rot = utils.valueQueue([opt.rot, reuse.rot, false]);
  if (isRTL) opt.charset = reshaper.convertArabic(opt.charset);
  let charset = opt.charset = (typeof opt.charset === 'string' ? Array.from(opt.charset) : opt.charset) || reuse.charset || defaultCharset;

  // TODO: Validate options
  if (fieldType !== 'msdf' && fieldType !== 'sdf' && fieldType !== 'psdf') {
    throw new TypeError('fieldType must be one of msdf, sdf, or psdf');
  }

  const font = typeof fontPath === 'string'
    ? opentype.loadSync(fontPath)
    : opentype.parse(utils.bufferToArrayBuffer(fontPath));

  if (font.outlinesFormat !== 'truetype' && font.outlinesFormat !== 'cff') {
    throw new TypeError('must specify a truetype font (ttf, otf, woff)');
  }
  const packer = new MaxRectsPacker(textureWidth, textureHeight, texturePadding, {
    smart: smartSize,
    pot: pot,
    square: square,
    allowRotation: allowRotation,
    tag: false,
    border: border
  });
  const chars = [];

  charset = charset.filter((e, i, self) => {
    return (i == self.indexOf(e)) && (!controlChars.includes(e));
  }); // Remove duplicate & control chars

  const os2 = font.tables.os2;
  const baseline = os2.sTypoAscender * (fontSize / font.unitsPerEm) + (distanceRange >> 1);

  const fontface = typeof fontPath === 'string' ? path.basename(fontPath, path.extname(fontPath)) : filename;

  if(!filename) {
    filename = fontface;
    console.log(`Use font-face as filename : ${filename}`);
  } else {
    if (opt.filename) fontDir = path.dirname(opt.filename);
    filename = opt.filename = path.basename(filename, path.extname(filename));
  }

  // Initialize settings
  let settings = {};
  settings.opt = JSON.parse(JSON.stringify(opt));
  delete settings.opt['reuse']; // prune previous settings
  let pages = [];
  if (cfg.packer !== undefined) {
    pages = cfg.pages;
    packer.load(cfg.packer.bins);
  }

  let bar;
  bar = new ProgressBar.Bar({
    format: "Generating {percentage}%|{bar}| ({value}/{total}) {duration}s",
    clearOnComplete: true
  }, ProgressBar.Presets.shades_classic); 
  bar.start(charset.length, 0);

  mapLimit(charset, 15, (char, cb) => {
    generateImage({
      binaryPath,
      font,
      char,
      fontSize,
      fieldType,
      distanceRange,
      roundDecimal,
      debug,
      tolerance
    }, (err, res) => {
      if (err) return cb(err);
      bar.increment();
      cb(null, res);
    });
  }, async (err, results) => {
    if (err) callback(err);
    bar.stop();

    packer.addArray(results);
    const textures = packer.bins.map(async (bin, index) => {
      let svg = "";
      let texname = "";
      let fillColor = fieldType === "msdf" ? 0x000000ff : 0x00000000;
      let img = new Jimp(bin.width, bin.height, fillColor);
      if (index > pages.length - 1) { 
        if (packer.bins.length > 1) texname = `${filename}.${index}`;
        else texname = filename; 
        pages.push(`${texname}.png`);
      } else {
        texname = path.basename(pages[index], path.extname(pages[index]));
        let imgPath = path.join(fontDir, `${texname}.png`);
        // let imgPath = `${texname}.png`;
        console.log('Loading previous image : ', imgPath);
        const loader = Jimp.read(imgPath);
        loader.catch(err => {
          console.warn("File read error: ", err);
        });
        const prevImg = await loader;
        img.composite(prevImg, 0, 0);
      }
      bin.rects.forEach(rect => {
        if (rect.data.imageData) {
          if (rect.rot) {
            rect.data.imageData.rotate(90);
          }
          img.composite(rect.data.imageData, rect.x, rect.y);
          if (debug) {
            const x_woffset = rect.x - rect.data.fontData.xoffset + (distanceRange >> 1);
            const y_woffset = rect.y - rect.data.fontData.yoffset + baseline + (distanceRange >> 1);
            svg += font.charToGlyph(rect.data.fontData.char).getPath(x_woffset, y_woffset, fontSize).toSVG() + "\n";
          }
        }
        const charData = rect.data.fontData;
        charData.x = rect.x;
        charData.y = rect.y;
        charData.page = index;
        chars.push(rect.data.fontData);
      });
      const buffer = await img.getBufferAsync(Jimp.MIME_PNG);
      let tex = {
        filename: path.join(fontDir, texname),
        texture: buffer 
      }
      if (debug) tex.svg = svg;
      return tex;
    });

    const asyncTextures = await Promise.all(textures);

    const kernings = [];
    charset.forEach(first => {
      charset.forEach(second => {
        const amount = font.getKerningValue(font.charToGlyph(first), font.charToGlyph(second));
        if (amount !== 0) {
          kernings.push({
            first: first.charCodeAt(0),
            second: second.charCodeAt(0),
            amount: amount * (fontSize / font.unitsPerEm)
          });
        }
      });
    });

    const fontData = {
      pages,
      chars,
      info: {
        face: fontface,
        size: fontSize,
        bold: 0,
        italic: 0,
        charset,
        unicode: 1,
        stretchH: 100,
        smooth: 1,
        aa: 1,
        padding: fontPadding,
        spacing: fontSpacing,
        outline: 0
      },
      common: {
        lineHeight: (os2.sTypoAscender - os2.sTypoDescender + os2.sTypoLineGap) * (fontSize / font.unitsPerEm),
        base: baseline,
        scaleW: packer.bins[0].width,
        scaleH: packer.bins[0].height,
        pages: packer.bins.length,
        packed: 0,
        alphaChnl: 0,
        redChnl: 0,
        greenChnl: 0,
        blueChnl: 0
      },
      distanceField: {
        fieldType: fieldType,
        distanceRange: distanceRange
      },
      kernings: kernings
    };
    if(roundDecimal !== null) utils.roundAllValue(fontData, roundDecimal, true);
    let fontFile = {};
    const ext = outputType === "json" ? `.json` : `.fnt`;
    fontFile.filename = path.join(fontDir, fontface + ext);
    fontFile.data = utils.stringify(fontData, outputType);

    // Store pages name and available packer freeRects in settings
    settings.pages = pages;
    settings.packer = {};
    settings.packer.bins = packer.save(); 
    fontFile.settings = settings;

    console.log("\nGeneration complete!\n");
    callback(null, asyncTextures, fontFile);
  });
}

function generateImage (opt, callback) {
  const {binaryPath, font, char, fontSize, fieldType, distanceRange, roundDecimal, debug, tolerance} = opt;
  const glyph = font.charToGlyph(char);
  const commands = glyph.getPath(0, 0, fontSize).commands;
  let contours = [];
  let currentContour = [];
  const bBox = glyph.getPath(0, 0, fontSize).getBoundingBox();
  commands.forEach(command => {
    if (command.type === 'M') { // new contour
      if (currentContour.length > 0) {
        contours.push(currentContour);
        currentContour = [];
      }
    }
    currentContour.push(command);
  });
  contours.push(currentContour);

  if (tolerance != 0) {
    utils.setTolerance(tolerance, tolerance * 10);
    let numFiltered = utils.filterContours(contours);
    if (numFiltered && debug)
      console.log(`\n${char} removed ${numFiltered} small contour(s)`);
    // let numReversed = utils.alignClockwise(contours, false);
    // if (numReversed && debug)
    //   console.log(`${char} found ${numReversed}/${contours.length} reversed contour(s)`);
  }
  let shapeDesc = utils.stringifyContours(contours);

  if (contours.some(cont => cont.length === 1)) console.log('length is 1, failed to normalize glyph');
  const scale = fontSize / font.unitsPerEm;
  const baseline = font.tables.os2.sTypoAscender * (fontSize / font.unitsPerEm);
  const pad = distanceRange >> 1;
  let width = Math.round(bBox.x2 - bBox.x1) + pad + pad;
  let height = Math.round(bBox.y2 - bBox.y1) + pad + pad;
  let xOffset = Math.round(-bBox.x1) + pad;
  let yOffset = Math.round(-bBox.y1) + pad;
  if (roundDecimal != null) {
    xOffset = utils.roundNumber(xOffset, roundDecimal);
    yOffset = utils.roundNumber(yOffset, roundDecimal);
  }
  let command = `"${binaryPath}" ${fieldType} -format text -stdout -size ${width} ${height} -translate ${xOffset} ${yOffset} -pxrange ${distanceRange} -stdin`;

  let subproc = exec(command, (err, stdout, stderr) => {
    if (err) return callback(err);
    const rawImageData = stdout.match(/([0-9a-fA-F]+)/g).map(str => parseInt(str, 16)); // split on every number, parse from hex
    const pixels = [];
    const channelCount = rawImageData.length / width / height;

    if (!isNaN(channelCount) && channelCount % 1 !== 0) {
      console.error(command);
      console.error(stdout);
      return callback(new RangeError('msdfgen returned an image with an invalid length'));
    }
    if (fieldType === 'msdf') {
      for (let i = 0; i < rawImageData.length; i += channelCount) {
        pixels.push(...rawImageData.slice(i, i + channelCount), 255); // add 255 as alpha every 3 elements
      }
    } else {
      for (let i = 0; i < rawImageData.length; i += channelCount) {
        pixels.push(rawImageData[i], rawImageData[i], rawImageData[i], rawImageData[i]); // make monochrome w/ alpha
      }
    }
    let imageData;
    if (isNaN(channelCount) || !rawImageData.some(x => x !== 0)) { // if character is blank
      readline.clearLine(process.stdout);
      readline.cursorTo(process.stdout, 0);
      console.log(`Warning: no bitmap for character '${char}' (${char.charCodeAt(0)}), adding to font as empty`);
      width = 0;
      height = 0;
    } else {
      const buffer = new Uint8ClampedArray(pixels);
      imageData = new Jimp({data: buffer, width: width, height: height});
    }
    const container = {
      data: {
        imageData,
        fontData: {
          id: char.charCodeAt(0),
          index: glyph.index,
          char: String(char),
          width: width,
          height: height,
          xoffset: Math.round(bBox.x1) - pad,
          yoffset: Math.round(bBox.y1) + pad + baseline,
          xadvance: glyph.advanceWidth * scale,
          chnl: 15
        }
      },
      width: width,
      height: height
    };
    callback(null, container);
  });
  
  subproc.stdin.write(shapeDesc);
  subproc.stdin.write('\n');
  subproc.stdin.destroy();
}

