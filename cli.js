#!/usr/bin/env node

const pkg = require('./package.json');
const generateBMFont = require('./index');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const { Command } = require('commander');
const program = new Command();
const utils = require('./lib/utils');
const logger = generateBMFont.defaultLogger;

(async () => {
  const updateNotifier = (await import('update-notifier')).default;
  updateNotifier({pkg}).notify();

  let fontFile;
  program
    .version('msdf-bmfont-xml v' + pkg.version)
    .usage('[options] <font-file>')
    .argument('<font_file>', 'font file to process')
    .description('Creates a BMFont compatible bitmap font of signed distance fields from a font file')
    .option('-f, --output-type <format>', 'font file format: xml(default) | json | txt', 'xml')
    .option('-o, --filename <atlas_path>', 'filename of font textures (defaut: font-face) font filename always set to font-face name')
    .option('-s, --font-size <fontSize>', 'font size for generated textures', 42)
    .option('-i, --charset-file <charset>', 'user-specified charactors from text-file', fileExistValidate)
    .option('-m, --texture-size <w,h>', 'ouput texture atlas size', (v) => {return v.split(',')}, [2048, 2048])
    .option('-p, --texture-padding <n>', 'padding between glyphs', 1)
    .option('-b, --border <n>', 'space between glyphs textures & edge', 0)
    .option('-r, --distance-range <n>', 'distance range for SDF', 4)
    .option('-t, --field-type <type>', 'msdf(default) | sdf | psdf', 'msdf')
    .option('-d, --round-decimal <digit>', 'rounded digits of the output font file.', 0)
    .option('-v, --vector', 'generate svg vector file for debuging', false)
    .option('-u, --reuse [file.cfg]', 'save/create config file for reusing settings', false)
    .option('--smart-size', 'shrink atlas to the smallest possible square', true)
    .option('--pot', 'atlas size shall be power of 2', false)
    .option('--square', 'atlas size shall be square', false)
    .option('--rot', 'allow 90-degree rotation while packing', false)
    .option('--rtl', 'use RTL(Arabic/Persian) charactors fix', false)
    .action((file) => {
      fontFile = fileExistValidate(file);
    });

  program.parse(process.argv);

  //
  // Initialize options
  //
  const opt = program.opts();
  utils.roundAllValue(opt); // Parse all number from string
  if (!fontFile) {
    logger.error('Must specify font-file, use: \'msdf-bmfont -h\' for more infomation');
    process.exit(1);
  }
  const fontface = path.basename(fontFile, path.extname(fontFile));
  const fontDir = path.dirname(fontFile);

  //
  // Set default value
  //
  // Note: somehow commander.js didn't parse boolean default value
  // need to feed manually
  //
  opt.fontFile = fontFile;
  if (typeof opt.reuse === 'boolean') {
    opt.filename = utils.valueQueue([opt.filename, path.join(fontDir, fontface)]);
    opt.vector = utils.valueQueue([opt.vector, false]);
    opt.reuse = utils.valueQueue([opt.reuse, false]);
    opt.smartSize = utils.valueQueue([opt.smartSize, false]);
    opt.pot = utils.valueQueue([opt.pot, false]);
    opt.square = utils.valueQueue([opt.square, false]);
    opt.rot = utils.valueQueue([opt.rot, false]);
    opt.rtl = utils.valueQueue([opt.rtl, false]);
  } else {
    opt.filename = utils.valueQueue([opt.filename, path.join("./", fontface)]);
  }

  //
  // Display options
  //
  const keys = Object.keys(opt)
  const padding = longestLength(keys) + 2;
  logger.log("Using following settings");
  logger.log("========================================");
  keys.forEach(key => {
    if (typeof opt.reuse === 'string' && typeof opt[key] === 'undefined') {
      logger.log(`${pad(key, padding)}: Defined in [${opt.reuse}]`);
    } else if (key === 'charsetFile' && typeof opt[key] === 'undefined') {
      logger.log(`${pad(key, padding)}: Unspecified, fallback to ASC-II`);
    } else logger.log(`${pad(key, padding)}: ${opt[key]}`);
  });
  logger.log("========================================");

  //
  // Validate
  //
  if (typeof opt.fontFile === 'undefined') {
    logger.error('No font file specified, aborting.... use -h for help');
    process.exit(1);
  }
  if (typeof opt.reuse !== 'boolean') opt.reuse = fileValidate(opt.reuse);

  fs.readFile(opt.charsetFile || '', 'utf8', (error, data) => {
    if (error) {
      logger.warn('No valid charset file loaded, fallback to ASC-II');
    }
    if (data) opt.charset = data;

    generateBMFont(opt.fontFile, opt, (error, textures, font) => {
      if (error) throw error;
      textures.forEach((texture, index) => {
        if (opt.vector) {
          const svgTemplate =
          `<?xml version="1.0"?>
  <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
  <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="{{width}}" height="{{height}}">
  {{{svgPath}}}
  </svg>`;
          const template = handlebars.compile(svgTemplate);
          const content = template({
            width: opt.textureWidth,
            height: opt.textureHeight,
            svgPath: texture.svg
          });
          fs.writeFile(`${texture.filename}.svg`, content , (err) => {
            if (err) throw err;
            logger.log(`wrote svg[${index}]\t\t: ${texture.filename}.svg`);
          });
        }
        fs.writeFile(`${texture.filename}.png`, texture.texture, (err) => {
          if (err) throw err;
          logger.log(`wrote spritesheet[${index}]\t: ${texture.filename}.png`);
        });
      });
      fs.writeFile(font.filename, font.data, (err) => {
        if (err) throw err;
        logger.log(`wrote font file\t\t: ${font.filename}`);
      });
      if(opt.reuse !== false) {
        let cfgFileName = typeof opt.reuse === 'boolean' ? `${textures[0].filename}.cfg` : opt.reuse;
        fs.writeFile(cfgFileName, JSON.stringify(font.settings, null, '\t'), (err) => {
          if (err) throw err;
          logger.log(`wrote cfg file\t\t: ${cfgFileName}`);
        });
      }
    });
  });

  /**
   * Pad `str` to `width`.
   *
   * @param {String} str
   * @param {Number} width
   * @return {String}
   * @api private
   */
  function pad(str, width) {
    var len = Math.max(0, width - str.length);
    return str + Array(len + 1).join(' ');
  }

  /**
   * Return the largest length of string array.
   *
   * @param {Array.<String>} arr
   * @return {Number}
   * @api private
   */

  function longestLength(arr) {
    return arr.reduce((max, element) => {
      return Math.max(max, element.length);
    }, 0);
  };

  function fileExistValidate(filePath) {
    try {
      if(fs.statSync(filePath).isFile()) return path.normalize(filePath);
      else {
        logger.error(`File: ${filePath} not found! Aborting...`);
        process.exit(1);
      }
    } catch(err) {
        logger.error(`File: ${filePath} not valid! Aborting...`);
        process.exit(1);
    }
  }

  function fileValidate(filePath) {
    if (require('is-invalid-path')(filePath)) {
      logger.error(`File: ${filePath} not valid! Aborting...`);
      process.exit(1);
    } else return path.normalize(filePath);
  }
})();
