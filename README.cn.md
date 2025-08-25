# msdf-bmfont-xml

[🇺🇸 English Doc](./README.md)

[![GitHub Actions](https://github.com/soimy/msdf-bmfont-xml/actions/workflows/node.js.yml/badge.svg)](https://github.com/soimy/msdf-bmfont-xml/actions)
[![npm version](https://badge.fury.io/js/msdf-bmfont-xml.svg)](https://badge.fury.io/js/msdf-bmfont-xml)
![npm](https://img.shields.io/npm/dm/msdf-bmfont-xml.svg)

将 `.ttf` 字体文件转换为多通道有符号距离场（MSDF），并输出打包的精灵图和 AngelCode BMFont 格式的 `xml(.fnt)` / `txt(.fnt)` 或 `json` 字体数据。

有符号距离场是一种通过纹理重现矢量图形的方法，详见 [Valve 的论文](http://www.valvesoftware.com/publications/2007/SIGGRAPH2007_AlphaTestedMagnification.pdf)。本工具使用 [Chlumsky/msdfgen](https://github.com/Chlumsky/msdfgen) 生成多通道距离场以保留字体边角。距离场由矢量字体生成，并渲染到纹理页。BMFont 对象用于字符排版。（参考 [BMFont 格式](http://www.angelcode.com/products/bmfont/doc/file_format.html)）

![预览图](https://raw.githubusercontent.com/soimy/msdf-bmfont-xml/master/assets/msdf-bmfont-xml.png)

## 支持平台

- macOS（Intel & Apple Silicon）
- Linux（x64 & ARM64）
- Windows（x64）

## 使用 pixi.js 在浏览器预览 MSDF 字体

```bash
npm install & npm run render
```

## 作为 CLI 安装

```bash
npm install msdf-bmfont-xml -g
```

> ### msdfgen 多平台可执行程序
>
> 本工具的字符生成msdf贴图依赖于 [msdfgen](https://github.com/Chlumsky/msdfgen) 目前已经支持最新版本(1.12.1)的多平台可执行程序
>
> **✨ 更新**：所有支持平台的 msdfgen 二进制文件现已预置在仓库并通过 npm 分发，避免 GitHub 流量限制和下载失败。安装时不会自动下载。
> 如需要手动下载更新，请参阅 [MSDFGEN_INSTALL.md](./docs/MSDFGEN_INSTALL.cn.md)。
>
> 在 macOS 上，安装器会自动处理安全限制（移除隔离属性、代码签名等) 详见 [MACOS_SECURITY.md](./docs/MACOS_SECURITY.cn.md)。
>

安装完成后，直接在控制台运行 `msdf-bmfont` 生成字体文件。
输入 `msdf-bmfont --help` 查看详细用法。

![控制台演示](https://raw.githubusercontent.com/soimy/msdf-bmfont-xml/master/assets/console-demo.gif)

### 用法

```bash
Usage: msdf-bmfont [options] <font-file>

Creates a BMFont compatible bitmap font of signed distance fields from a font file

Options:
  -V, --version                 输出版本号
  -f, --output-type <format>    字体文件格式: xml(默认) | json | txt (默认: "xml")
  -o, --filename <atlas_path>   字体纹理文件名（默认: 字体名称）
                                字体文件名始终设为字体名称
  -s, --font-size <fontSize>    生成纹理的字体大小（默认: 42）
  -i, --charset-file <charset>  从文本文件指定字符集
  -m, --texture-size <w,h>      输出纹理图集大小（默认: [2048,2048]）
  -p, --texture-padding <n>     字形间距（默认: 1）
  -b, --border <n>              字形与边缘的空间（默认: 0）
  -r, --distance-range <n>      SDF 距离范围（默认: 4）
  -t, --field-type <type>       msdf(默认) | sdf | psdf (默认: "msdf")
  -d, --round-decimal <digit>   输出字体文件的小数位数（默认: 0）
  -v, --vector                  生成 SVG 矢量文件用于调试
  -u, --reuse [file.cfg]        保存/创建配置文件以复用设置（默认: false）
      --smart-size              图集自动缩小为最小正方形
      --pot                     图集尺寸为 2 的幂
      --square                  图集尺寸为正方形
      --rot                     打包时允许 90 度旋转
      --rtl                     使用 RTL（阿拉伯/波斯语）字符修正
  -h, --help                    输出帮助信息
```

### CLI 示例

生成带 ASCII 字符集、字体大小 42、spread 3、最大纹理尺寸 512x256、间距 1，并保存配置文件的多通道距离场字体图集：

```bash
msdf-bmfont --reuse -o path/to/atlas.png -m 512,256 -s 42 -r 3 -p 1 -t msdf path/to/font.ttf
```

将生成三个文件：`atlas.0.png` `atlas.0.cfg` 和 `font.fnt`，如下为最小 pot 尺寸（256x256）的图集：

![Atlas0](https://raw.githubusercontent.com/soimy/msdf-bmfont-xml/master/assets/atlas.0.png)

如需用旧配置但更换字体，并生成单通道距离场及 SVG 图集：

```bash
msdf-bmfont -v -u path/to/atlas.0.cfg -t sdf -p 0 -r 8 path/to/anotherfont.ttf
```

将得到新的 `atlas.0.png`，追加了新字体：

![Atlas1](https://raw.githubusercontent.com/soimy/msdf-bmfont-xml/master/assets/atlas.1.jpg)

不满意风格？SVG 图集也可用！

![svg](https://raw.githubusercontent.com/soimy/msdf-bmfont-xml/master/assets/svg.png)

还可以用图形编辑器为输出图集添加特效：

![final](https://raw.githubusercontent.com/soimy/msdf-bmfont-xml/master/assets/atlas.2.jpg)

## 作为模块安装

```bash
npm install msdf-bmfont-xml
```

### 模块用法示例

将距离场和字体数据写入磁盘：

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

自定义字符集生成单通道距离场：

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

根据 `fontPath` 或 `fontBuffer` 指定的字体渲染位图字体，可选参数 `opt`，完成后触发 `callback`。

参数说明：

- `outputType` (String)
  - 输出字体文件类型，默认 `xml`
    - `xml` 标准 BMFont .fnt 文件，广泛支持
    - `json` 兼容 [Hiero](https://github.com/libgdx/libgdx/wiki/Hiero) 的 JSON 文件
- `filename` (String)
  - 字体文件和图集文件名，若省略则用字体名称。若字体为 Buffer，必填。
- `charset` (String|Array)
  - 包含在位图字体中的字符，默认所有 ASCII 可打印字符
- `fontSize` (Number)
  - 生成距离场的字体大小，默认 `42`
- `textureSize` (Array[2])
  - 输出纹理尺寸，通常为 2 的幂，默认 `[512, 512]`
- `texturePadding` (Number)
  - 字形间距，默认 `2`
- `border` (Number)
  - 字形与边缘空间，默认 `0`
- `fieldType` (String)
  - 距离场类型，默认 `msdf`，可选：
    - `msdf` 多通道距离场
    - `sdf` 单通道距离场
    - `psdf` 单通道伪距离场
- `distanceRange` (Number)
  - 距离场范围宽度，默认 `3`
- `roundDecimal` (Number)
  - 输出字体度量的小数位数，推荐 `xml` 输出时用 `0`
- `vector` (Boolean)
  - 输出 SVG 矢量文件用于调试，默认 `false`
- `smart-size` (Boolean)
  - 图集自动缩小为最小正方形，默认 `false`
- `pot` (Boolean)
  - 图集尺寸为 2 的幂，默认 `false`
- `square` (Boolean)
  - 图集尺寸为正方形，默认 `false`
- `rot` (Boolean)
  - 打包时允许 90 度旋转，默认 `false`
- `rtl` (Boolean)
  - 使用 RTL（阿拉伯/波斯语）字符修正，默认 `false`

`callback` 参数为 `(error, textures, font)`：

- `error` 成功时为 null/undefined
- `textures` 纹理图集对象数组
  - `textures[index].filename` 图集文件名
  - `textures[index].texture` PNG 图像 Buffer
- `font` BMFont 数据对象
  - `font.filename` 字体文件名
  - `font.data` 字体数据字符串（xml/json）

`opt` 可选，第二参数可直接传 `callback`。

## License

MIT，详见 [LICENSE.md](http://github.com/Jam3/xhr-request/blob/master/LICENSE.md)。
