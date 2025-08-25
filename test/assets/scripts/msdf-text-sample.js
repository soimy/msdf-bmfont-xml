//@ts-check

const options = { 
    width: window.innerWidth,
    height: window.innerHeight,
    resolution: window.devicePixelRatio,
    backgroundColor: 0xAAAAAA
}
const app = new PIXI.Application(options);
document.body.appendChild(app.view);
app.stop();

const fontFace = getURLParameter("f") || "DIN_CB";
const fontFile = `assets/fonts/${fontFace}.fnt`;
// const fontFace = fontFile.split('\\').pop().split('/').pop().split('.').shift();
const text = getURLParameter("t") || "The quick brown fox jumps\nover the lazy dog";

const resourceList = [ fontFile ];
app.loader.add(resourceList).load(onAssetsLoaded);

let sampleText;
let isDrag = false;
let lastPointerVector, lastRot, lastScale;
let textControl;

function onAssetsLoaded() {
    const textOptions = {
        fontFace: fontFace,
        fontSize: 150,
        fillColor: 0xFFAA22,
        weight: 0.4,
        strokeThickness: 0.3,
        strokeColor: 0x051855,
        dropShadow: true,
        dropShadowColor: 0x000000,
        dropShadowOffset: new PIXI.Point(0.004, 0.004),
        dropShadowAlpha: 0.4,
        dropShadowBlur: 0.1,
        align: "center",
        letterSpacing: 0,
        baselineOffset: 8,
        debugLevel: 3
    }
    sampleText = new MSDFText.MSDFText(text, textOptions);
    app.stage.addChild(sampleText);
    sampleText.pivot.set(sampleText.textWidth / 2, sampleText.textHeight / 2);
    sampleText.position.set(app.screen.width / 2, app.screen.height / 2);
    app.start();

    sampleText.interactive = true;
    sampleText.buttonMode = true;

    sampleText.on("mousedown", e => {
        const pos = e.data.getLocalPosition(app.stage);
        lastPointerVector = new PIXI.Point(pos.x - sampleText.x, pos.y - sampleText.y);
        lastRot = sampleText.rotation;
        lastScale = sampleText.scale.x;
        isDrag = true;
        sampleText.tint = 0xAAAAAA;
    });

    sampleText.on("mousemove", e => {
        if (!isDrag) return;
        const p = e.data.getLocalPosition(app.stage);
        const pointerVector = new PIXI.Point(p.x - sampleText.x, p.y - sampleText.y);
        sampleText.rotation = lastRot - getRadsBetween(lastPointerVector, pointerVector);
        const scale = vectorLength(pointerVector) / vectorLength(lastPointerVector) * lastScale; 
        sampleText.scale.set(scale, scale);
    });
    sampleText.on("mouseup", e => {
        isDrag = false;
        sampleText.tint = 0xFFFFFF;
    });
    
    const gui = new dat.GUI();
    textControl = gui.add(sampleText, "text").onChange(rePosition);
}

function getRadsBetween(vec1, vec2) {
    return Math.atan2(vec1.y, vec1.x) - Math.atan2(vec2.y, vec2.x);
}

function vectorLength(vec) {
    return Math.sqrt(vec.x * vec.x + vec.y * vec.y);
}

function rePosition() {
    sampleText.pivot.set(sampleText.textWidth / 2, sampleText.textHeight / 2);
    sampleText.position.set(app.screen.width / 2, app.screen.height / 2);
}

function getURLParameter (param) {
    const pageURL = window.location.href;
    const url = new URL(pageURL);
    const value = url.searchParams.get(param);
    return value;
}