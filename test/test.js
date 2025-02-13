const open = require('open');
const handler = require('serve-handler');
const http = require('http');
const logger = require("../index").defaultLogger;

const fontFile = process.argv[3] || "DIN_CB";
const text = process.argv[2] || "The quick brown fox jumps\nover the lazy dog";

const server = http.createServer((request, response) => {
    // You pass two more arguments for config and middleware
    // More details here: https://github.com/zeit/serve-handler#options
    return handler(request, response, {public: 'test'});
});

const url = `http://localhost:9527/?f=${encodeURIComponent(fontFile)}&t=${encodeURIComponent(text)}`;

(async () => {
    server.listen(9527, () => {
        logger.log(`Test server running at ${url}`);
    });
    await open(url, {wait: true});
})().then(() =>  {
    logger.log('Closing test server');
    server.close();
});