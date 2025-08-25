# msdf-bmfont-xml

[🇨🇳 中文文档](./README.cn.md)

[![GitHub Actions](https://github.com/soimy/msdf-bmfont-xml/actions/workflows/node.js.yml/badge.svg)](https://github.com/soimy/msdf-bmfont-xml/actions)
[![npm version](https://badge.fury.io/js/msdf-bmfont-xml.svg)](https://badge.fury.io/js/msdf-bmfont-xml)
![npm](https://img.shields.io/npm/dm/msdf-bmfont-xml.svg)

Converts a `.ttf` font file into multichannel signed distance fields, then outputs packed spritesheets and an `xml(.fnt}` / `txt(.fnt)` or `json` representation of an AngelCode BMFont file.

Signed distance fields are a method of reproducing vector shapes from a texture representation, popularized in [this paper by Valve](http://www.valvesoftware.com/publications/2007/SIGGRAPH2007_AlphaTestedMagnification.pdf).
This tool uses [Chlumsky/msdfgen](https://github.com/Chlumsky/msdfgen) to generate multichannel signed distance fields to preserve corners. The distance fields are created from vector fonts, then rendered into texture pages. A BMFont object is provided for character layout. (See: [BMFont format](http://www.angelcode.com/products/bmfont/doc/file_format.html))
![Preview image](https://raw.githubusercontent.com/soimy/msdf-bmfont-xml/master/assets/msdf-bmfont-xml.png)

## Supported Platforms

- macOS (Intel & Apple Silicon)
- Linux (x64 & ARM64)
- Windows (x64)

> ## msdfgen Multi-platform Executables
>
> This tool's character MSDF generation depends on [msdfgen](https://github.com/Chlumsky/msdfgen), now supporting the latest version (1.12.1) for all platforms.
>
> **✨ Update**: All msdfgen binaries for supported platforms are now pre-bundled in the repo and distributed via npm, avoiding GitHub rate limits and download failures. No automatic download during installation. For manual updates, see [MSDFGEN_INSTALL.md](./docs/MSDFGEN_INSTALL.md).
>
> On macOS, the installer automatically handles security restrictions (removes quarantine attributes, applies code signatures). See [MACOS_SECURITY.md](./docs/MACOS_SECURITY.md) for details.
>

After installation, simply run `msdf-bmfont` in the console to generate font files. Type `msdf-bmfont --help` for usage details.

## Run script to see MSDF font in browser using pixi.js

```bash
npm install & npm run render
```

## Install as CLI

```bash
npm install msdf-bmfont-xml -g
```

**✨ Update**: All msdfgen binaries for supported platforms are now pre-bundled in the repo and distributed via npm. This avoids GitHub rate limits and download failures. No automatic download is performed during installation.

Supported platforms:

- macOS (Intel & Apple Silicon)
- Linux (x64 & ARM64)
- Windows (x64)

On macOS, the installer still automatically handles security restrictions by removing quarantine attributes and applying code signatures (see `MACOS_SECURITY.md`).

After installation, simply call `msdf-bmfont` from the console to generate font files.
Type `msdf-bmfont --help` for more usage details.

![Console-Demo](https://raw.githubusercontent.com/soimy/msdf-bmfont-xml/master/assets/console-demo.gif)

### Usage

```bash
Usage: msdf-bmfont [options] <font-file>

Creates a BMFont compatible bitmap font of signed distance fields from a font file

Options:
  -V, --version                 output the version number
  -f, --output-type <format>    font file format: xml(default) | json | txt (default: "xml")
  -o, --filename <atlas_path>   filename of font textures (defaut: font-face)
                                font filename always set to font-face name
  -s, --font-size <fontSize>    font size for generated textures (default: 42)
  -i, --charset-file <charset>  user-specified charactors from text-file
  -m, --texture-size <w,h>      ouput texture atlas size (default: [2048,2048])
  -p, --texture-padding <n>     padding between glyphs (default: 1)
  -b, --border <n>              space between glyphs textures & edge (default: 0)
  -r, --distance-range <n>      distance range for SDF (default: 4)
  -t, --field-type <type>       msdf(default) | sdf | psdf (default: "msdf")
  -d, --round-decimal <digit>   rounded digits of the output font file. (default: 0)
  -v, --vector                  generate svg vector file for debuging
  -u, --reuse [file.cfg]        save/create config file for reusing settings (default: false)
      --smart-size              shrink atlas to the smallest possible square
      --pot                     atlas size shall be power of 2
      --square                  atlas size shall be square
      --rot                     allow 90-degree rotation while packing
      --rtl                     use RTL(Arabic/Persian) charactors fix
  -h, --help                    output usage information
```

### CLI Examples

Generate a multi-channel signed distance field font atlas with ASCII charset, font size 42, spread 3, maximum texture size 512x256, padding 1, and save out config file:

```bash
msdf-bmfont --reuse -o path/to/atlas.png -m 512,256 -s 42 -r 3 -p 1 -t msdf path/to/font.ttf
```

We will get three file: `atlas.0.png` `atlas.0.cfg` & `font.fnt` and this is the generated atlas in the minimum pot size (256x256):

![Atlas0](https://raw.githubusercontent.com/soimy/msdf-bmfont-xml/master/assets/atlas.0.png)

Then we want to use the old setting except a different font and use monochrome signed distance field atlas, and output an extra `.svg` version of atlas:

```bash
msdf-bmfont -v -u path/to/atlas.0.cfg -t sdf -p 0 -r 8 path/to/anotherfont.ttf
```

This time we get a modified `atlas.0.png` with new bitmap font appended:

![Atlas1](https://raw.githubusercontent.com/soimy/msdf-bmfont-xml/master/assets/atlas.1.jpg)

Not satisfied with the style? Remember we got a `svg` atlas!

![svg](https://raw.githubusercontent.com/soimy/msdf-bmfont-xml/master/assets/svg.png)

How about fire up some graphic editor and add some neat effect and lay on the output atlas?

![final](https://raw.githubusercontent.com/soimy/msdf-bmfont-xml/master/assets/atlas.2.jpg)

## Install as Module

```bash
npm install msdf-bmfont-xml
```

### Module usage Examples

Writing the distance fields and font data to disk:

```js
const generateBMFont = require('msdf-bmfont-xml');
const fs = require('fs');

generateBMFont('Some-Font.ttf', (error, textures, font) => {
  if (error) throw error;
  textures.forEach((texture, index) => {
    fs.writeFile(texture.filename, texture.texture, (err) => {
      if (err) throw err;
    });
  });
  fs.writeFile(font.filename, font.data, (err) => {
    if (err) throw err;
  });
});
```

Generating a single channel signed distance field with a custom character set:

```js
const generateBMFont = require('msdf-bmfont');

const opt = {
  charset: 'ABC.ez_as-123!',
  fieldType: 'sdf'
};
generateBMFont('Some-Font.ttf', opt, (error, textures, font) => {
  ...
});
```

### API

#### `generateBMFont(fontPath | fontBuffer, [opt], callback)`

Renders a bitmap font from the font specified by `fontPath` or `fontBuffer`, with optional `opt` settings, triggering `callback` on complete.

Options:

- `outputType` (String)
  - type of output font file. Defaults to `xml`
    - `xml` a BMFont standard .fnt file which is wildly supported.
    - `json` a JSON file compatible with [Hiero](https://github.com/libgdx/libgdx/wiki/Hiero)
- `filename` (String)
  - filename of both font file and font atlas. If omited, font face name is used. **Required** if font is provided as a Buffer.
- `charset` (String|Array)
  - the characters to include in the bitmap font. Defaults to all ASCII printable characters.
- `fontSize` (Number)
  - the font size at which to generate the distance field. Defaults to `42`
- `textureSize` (Array[2])
  - the dimensions of an output texture sheet, normally power-of-2 for GPU usage. Both dimensions default to `[512, 512]`
- `texturePadding` (Number)
  - pixels between each glyph in the texture. Defaults to `2`
- `border` (Number)
  - space between glyphs textures & edge. Defaults to `0`
- `fieldType` (String)
  - what kind of distance field to generate. Defaults to `msdf`. Must be one of:
    - `msdf` Multi-channel signed distance field
    - `sdf` Monochrome signed distance field
    - `psdf` monochrome signed pseudo-distance field
- `distanceRange` (Number)
  - the width of the range around the shape between the minimum and maximum representable signed distance in pixels, defaults to `3`
- `roundDecimal` (Number)
  - rounded digits of the output font metics. For `xml` output, `roundDecimal: 0` recommended.
- `vector` (Boolean)
  - output a SVG Vector file for debugging. Defauts to `false`
- `smart-size` (Boolean)
  - shrink atlas to the smallest possible square. Default: `false`
- `pot` (Boolean)
  - output atlas size shall be power of 2. Default: `false`
- `square` (Boolean)
  - output atlas size shall be square. Default: `false`
- `rot` (Boolean)
  - allow 90-degree rotation while packing. Default: `false`
- `rtl` (Boolean)
  - use RTL(Arabic/Persian) charators fix. Default: `false`

The `callback` is called with the arguments `(error, textures, font)`

- `error` on success will be null/undefined
- `textures` an array of js objects of texture spritesheet.
  - `textures[index].filename` Spritesheet filename
  - `textures[index].texture` Image Buffers, containing the PNG data of one texture sheet
- `font` an object containing the BMFont data, to be used to render the font
  - `font.filename` font filename
  - `font.data` stringified xml\json data to be written to disk

Since `opt` is optional, you can specify `callback` as the second argument.

## License

MIT, see [LICENSE.md](http://github.com/Jam3/xhr-request/blob/master/LICENSE.md) for details.
