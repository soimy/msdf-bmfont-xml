"use strict";

const js2xmlparser = require('js2xmlparser');
const js2xmlOption = { format: { doubleQuotes: true } };

/**
 * Return the first valid element
 * 
 * @param {Array.<any>} array 
 */
function valueQueue(array) {
  for (var i = 0; i < array.length; i++) {
    if (typeof array[i] !== 'undefined') {
      return array[i];
    }
  }
}
exports.valueQueue = valueQueue;

/**
 * Round all number value in a javascript object at given decimal
 * 
 * @param {any} obj - Javascript object to be rounded 
 * @param {number} [decimal=0] - Round at this decimal 
 * @param {boolean} [strict=false] - set to `true` won't try to cast `string` to `number`  
 */
function roundAllValue (obj, decimal = 0, strict = false) {
  Object.keys(obj).forEach(key => {
    if (typeof(obj[key]) === "object" && obj[key] !== null) {
      roundAllValue (obj[key], decimal, strict);
    } else if(isNumeric(obj[key], strict)) {
      const num = parseFloat(obj[key]);
      obj[key] = roundNumber(num, decimal);
    }
  });
}
exports.roundAllValue = roundAllValue;

/**
 * Round a given value at desire decimal
 * 
 * @param {number} num 
 * @param {number} scale 
 * @return {number}
 */
function roundNumber(num, scale) {
  if(!("" + num).includes("e")) {
    return +(Math.round(num + "e+" + scale)  + "e-" + scale);
  } else {
    const arr = ("" + num).split("e");
    let sig = ""
    if(+arr[1] + scale > 0) {
      sig = "+";
    }
    return +(Math.round(+arr[0] + "e" + sig + (+arr[1] + scale)) + "e-" + scale);
  }
}
exports.roundNumber = roundNumber;

/**
 * Stringify javascript object to BMFont compatible json or xml
 * 
 * @param {Object} data - Java object data 
 * @param {string} outputType - Type of output "xml"(default) "json"
 * 
 */
function stringify(data, outputType) {
  if (outputType === "json") {
    return toJSON(data);
  } else if (outputType === "xml"){
    return toBMFontXML(data);
  } else {
    return toTXT(data);
  }
}
exports.stringify = stringify;

function toJSON(data) {
  return JSON.stringify(data, null, 4);
}

function toBMFontXML(data) {
  let xmlData = {};
  
  // Reorganize data structure
  // Definition: http://www.angelcode.com/products/bmfont/doc/file_format.html

  // info section
  xmlData.info = {};
  xmlData.info['@'] = data.info;
  xmlData.info['@'].padding = stringifyArray(data.info.padding, ',');
  xmlData.info['@'].spacing = stringifyArray(data.info.spacing, ',');
  // xmlData.info['@'].charset = stringifyArray(data.info.charset);
  xmlData.info['@'].charset = ""; 

  // common section
  xmlData.common = {};
  xmlData.common['@'] = data.common;

  // pages section, page shall be inserted later in module function callback
  xmlData.pages = {};
  xmlData.pages.page = []; 
  data.pages.forEach((p, i) => {
    let page = {};
    page['@'] = {id: i, file: p};
    xmlData.pages.page.push(page);
  });

  // distanceField section
  xmlData.distanceField = {};
  xmlData.distanceField['@'] = data.distanceField;

  // chars section
  xmlData.chars = {'@': {}};
  xmlData.chars['@'].count = data.chars.length;
  xmlData.chars.char = [];
  data.chars.forEach(c =>{
    let char = {};
    char['@'] = c;
    xmlData.chars.char.push(char);
  });

  // kernings section
  xmlData.kernings = {'@': {}};
  xmlData.kernings['@'].count = data.kernings.length;
  xmlData.kernings.kerning = [];
  data.kernings.forEach(k => {
    let kerning = {};
    kerning['@'] = k;
    xmlData.kernings.kerning.push(kerning);
  });
  
  return js2xmlparser.parse("font", xmlData, js2xmlOption);
}

function toTXT(data) {
  let output = "";
  
  // Reorganize data structure
  // Definition: http://www.angelcode.com/products/bmfont/doc/file_format.html
  // Game-engine like Godot & Defold do not accept xml format bmfont data, so txt format is needed.

  // info section
  let info = data.info;
  let padding = stringifyArray(info.padding, ",");
  let spacing = stringifyArray(info.spacing, ",");
  output += `info face=\"${info.face}\" size=${info.size} bold=${info.bold} italic=${info.italic} charset=\"\" unicode=${info.unicode} stretchH=${info.stretchH} smooth=${info.smooth} aa=${info.aa} padding=${padding} spacing=${spacing} outline=${info.outline}\n`;
  
  // common section
  let common = data.common;
  output += `common lineHeight=${common.lineHeight} base=${common.base} scaleW=${common.scaleW} scaleH=${common.scaleH} pages=${common.pages} packed=${common.packed} alphaChnl=${common.alphaChnl} redChnl=${common.redChnl} greenChnl=${common.greenChnl} blueChnl=${common.blueChnl}\n`;
  
  // page section
  let pages = data.pages;
  for (let i = 0; i < pages.length; i++) {
    output += `page id=${i} file=\"${pages[i]}\"\n`;
  }
  
  // for compatibility, no distanceField section for txt format
  
  // chars section
  let chars = data.chars;
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    output += `char id=${char.id} x=${char.x} y=${char.y} width=${char.width} height=${char.height} xoffset=${char.xoffset} yoffset=${char.yoffset} xadvance=${char.xadvance} page=${char.page} chnl=${char.chnl}\n`;
  }
  
  // kerning section
  let kerns = data.kernings;
  for (let i = 0; i < kerns.length; i++) {
    const k = kerns[i];
    output += `kerning first=${k.first} second=${k.second} amount=${k.amount}\n`;
  }
  
  return output;
}

/**
 * Stringify the given array, seperated by seperator
 * 
 * @param {any} array 
 * @param {string} [seperator=""] 
 * @returns {string} 
 */
function stringifyArray(array, seperator = "") {
  let result = "";
  let lastIndex = array.length - 1;
  array.forEach((element, index) => {
    result += element;
    if (index !== lastIndex){
      result += seperator;
    }
  });
  return result;
}
exports.stringifyArray = stringifyArray;

/**
 * Tell if the given object is string 
 * 
 * @param {any} n 
 * @returns {boolean} 
 */
function isString (s) {
  return (typeof s === 'string' || s instanceof String);
}
exports.isString = isString;

/**
 * Tell if the given object is numeric 
 * 
 * @param {any} n 
 * @param {boolean} [strict=false] strict casting
 * @returns {boolean} 
 */
function isNumeric (n, strict = false) {
  return !(isString(n) && strict) && !isNaN(parseFloat(n)) && isFinite(n);
}
exports.isNumeric = isNumeric;

/**
 * Tell if the given object is empty
 * 
 * @param {any} obj 
 * @returns 
 */
function isEmpty (obj) {
  if (Object.getOwnPropertyNames(obj).length > 0) return false;
  else return true;
}
exports.isEmpty = isEmpty;

function insidePath (command, contours) {
  let x = command.x, y = command.y;
  let inside = false;
  contours.forEach(contour => {
    for (let i = 0, j = contour.length - 1; i < contour.length; j = i++) {
      let xi = contour[i].x, yi = contour[i].y;
      let xj = contour[j].x, yj = contour[j].y;

      let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    if (inside) return;
  });
  return inside;
}

function isClockwise (contour) {
  let sum = 0;
  for (let i = 0; i < contour.length - 1; i++) {
      let command = contour[i], command_next = contour[i+1];
      if(command_next.type == 'Z') break;
      sum += (command_next.x - command.x) * (command_next.y + command.y);
  }
  return sum > 0
}

function reverseContour (contour) {
  let reversedContour = [];
  let tmpPoint = [];
  let hasCloseCmd = false;
  let isFirstCmd = true;

  for (let i = contour.length - 1; i > 0; i--) {
    let command = contour[i];
    let rev_comand = {};
    if (command.type === 'Z') {
      hasCloseCmd = true;
      continue;
    }
    if (isFirstCmd) {
      isFirstCmd = false;
      reversedContour.push({type: 'M', x: command.x, y: command.y});
    }
    rev_comand.type = command.type;
    rev_comand.x = contour[i - 1].x;
    rev_comand.y = contour[i - 1].y;
    if (command.type === 'C') {
      rev_comand.x1 = command.x2;
      rev_comand.y1 = command.y2;
      rev_comand.x2 = command.x1;
      rev_comand.y2 = command.y1;
    } else if (command.type === 'Q') {
      rev_comand.x1 = command.x1;
      rev_comand.y1 = command.y1;
    }
    reversedContour.push(rev_comand);
  }
  if (hasCloseCmd) {
    reversedContour.push({type: 'Z'});
  }
  return reversedContour;
}

/**
 * Align all contours' clockwiseness.
 * 
 * @param {Array} contours  Array of contour 
 * @param {boolean} direction  true for clockwise, false for counter-clockwise
 */
function alignClockwise(contours, direction) {
  let numReversed = 0;
  for (let i = 0; i < contours.length; i++) {
    let contour = contours[i];
    let restContours = contours.slice(0);
    restContours.splice(i, 1);
    if (contour.length === 0) continue;
    let isInside =  insidePath(contour[0], restContours) && 
                    insidePath(contour[Math.ceil(contour.length / 2)], restContours);
    let dir = isInside ? (!direction) : direction;
    if (isClockwise(contour) != dir) {
      contours[i] = reverseContour(contour);
      numReversed ++;
    }
  }
  return numReversed;
}
exports.alignClockwise = alignClockwise; 

/**
 * Convert contour commands to msdfgen shape description 
 * 
 * @param {Array} contours Array of font contour
 * @returns {string} 
 */
function stringifyContours(contours) {
  let shapeDesc = '';
  contours.forEach(contour => {
    shapeDesc += '{';
    const lastIndex = contour.length - 1;
    let _x, _y;
    contour.forEach((command, index) => {
      roundAllValue(command, 3);
      if (command.type === 'Z') {
        if(contour[0].x !== _x || contour[0].y !== _y) {
          shapeDesc += '# ';
        }
      } else {
        if (command.type === 'C') {
          shapeDesc += `(${command.x1}, ${command.y1}; ${command.x2}, ${command.y2}); `;
        } else if (command.type === 'Q') {
          shapeDesc += `(${command.x1}, ${command.y1}); `;
        }
        shapeDesc += `${command.x}, ${command.y}`;
        _x = command.x;
        _y = command.y;
        if (index !== lastIndex) {
          shapeDesc += '; ';
        }
      }
    });
    shapeDesc += '}';
  });
  return shapeDesc;
}
exports.stringifyContours = stringifyContours;

let pointTolerance = 0.5, areaTolerance = 2;
function setTolerance(pointValue, areaValue) {
  pointTolerance = pointValue;
  areaTolerance = areaValue;
}
exports.setTolerance = setTolerance;

function same(p1, p2) {
  return Math.abs(p1[0] - p2[0]) < pointTolerance && Math.abs(p1[1] - p2[1]) < pointTolerance;
}

class boundBox {
  constructor(left = 0, top = 0, right = 0, bottom = 0) {
    this.left = left;
    this.right = right;
    this.top = top;
    this.bottom = bottom;
    this.updateSize();
  }
 
  updateSize() {
    this.width = this.right - this.left;
    this.height = this.top - this.bottom;
  }

  update(x, y) {
    this.left = Math.min(this.left, x);
    this.right = Math.max(this.right, x);
    this.top = Math.max(this.top, y);
    this.bottom = Math.min(this.bottom, y);
    this.updateSize();
  }

  area() {
    this.updateSize();
    return this.width * this.height;
  }
}
module.exports.boundBox = boundBox;

function degenerate(p) {
  for (let i = 0; i < p.length - 1; i++) 
    if (same(p[i], p[i + 1])) p.splice(i, 1);
  return p.length;
} 

function isDegenerate(contour) {
  if (contour.length < 3) return true; // early quit with 0-area contour
  let bBox = new boundBox(contour[0].x, contour[0].y,contour[0].x, contour[0].y);
  for (let i = 0; i < contour.length - 1; i++) {
    let command_prev = contour[i];
    bBox.update(command_prev.x, command_prev.y);
    let command = contour[i + 1];
    let p = [[command_prev.x, command_prev.y]];
    if (command.type === 'C') { p.push([command.x1, command,y1]); p.push([command.x2, command.y2]); }
    else if (command.type === 'Q') p.push([command.x1, command.y1]);
    if (command.type === 'Z') p.push([contour[0].x, contour[0].y]);
    else p.push([command.x, command.y]); 
    
    let _nump = p.length;
    let nump = degenerate(p);
    if (nump < 2) {
      if (i === contour.length - 2 || command.type === 'Z') contour.splice(i, 1);
      else contour.splice(i + 1, 1);
      continue;
    } 
    // if point not degenerated, continue
    if (nump === _nump) continue;
    let newCommand = {};
    if (nump === 3) { 
      newCommand.type = 'Q';
      newCommand.x1 = p[1][0];
      newCommand.y1 = p[1][1];
      newCommand.x = p[2][0];
      newCommand.y = p[2][1];
    } else {
      newCommand.type = 'L';
      newCommand.x = p[1][0];
      newCommand.y = p[1][1];
    }
    contour[i + 1] = newCommand;
  }
  if (bBox.area() < areaTolerance || contour.length < 3) {
    return true;
  } else {
    return false;
  }
}

function filterContours(contours) {
  let filtered = 0;
  for (let i = 0; i < contours.length; i++) {
    if(isDegenerate(contours[i])) {
      contours.splice(i, 1);
      filtered ++;
    }
  }
  return filtered;
}
exports.filterContours = filterContours;

/**
 * Returns an ArrayBuffer representing the exact content of a Buffer.
 *
 * NodeJS's `fs` package may reuse a single ArrayBuffer as the underlying
 * storage for multiple readFile and readFileSync calls, so directly accessing
 * `buffer.buffer` is likely to give unexpected results unless sliced first.
 *
 * @param  {Buffer} buffer
 * @return {ArrayBuffer}
 */
function bufferToArrayBuffer(buffer) {
  const {byteOffset, byteLength} = buffer;
  return buffer.buffer.slice(byteOffset, byteOffset + byteLength);
}
exports.bufferToArrayBuffer = bufferToArrayBuffer;
