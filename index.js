const net = require('net');
const tls = require('tls');

/**
 * @typedef {Object} HttpClientResponse
 * @property {function(): number} getStatusCode - Get the status code of the response
 * @property {function(): Object.<string, string>} getHeaders - Get the headers of the response
 * @property {function(): string} getRawResponse - Get the raw response as a string
 * @property {function(function(): void): null} toStream - Convert the response to a stream
 * @property {function(): Promise<any>} toJSON - Parse the response body as JSON
 */

/**
 * Custom HTTP client for making network requests
 * @class
 */
class CustomHttpClient {
    /**
     * Create a new CustomHttpClient
     * @constructor
     */
    constructor() {
        /** @type {string} */
        this.requestId = '';
    }

    /**
     * Get the name of the client
     * @returns {string} The name of the client
     */
    getClientName() {
        return 'CustomSocketHttpClient';
    }

    /**
     * Make an HTTP request
     * @param {string} host - The host to connect to
     * @param {string|number} port - The port to connect to
     * @param {string} path - The path of the request
     * @param {'GET'|'POST'|'PUT'|'DELETE'} method - The HTTP method to use
     * @param {Object.<string, string>} headers - The headers to send with the request
     * @param {string|null} requestData - The data to send with the request
     * @param {'http'|'https'} protocol - The protocol to use
     * @param {number} timeout - The timeout for the request in milliseconds
     * @returns {Promise<HttpClientResponse>} A promise that resolves with the response
     */
    makeRequest(
        host,
        port,
        path,
        method,
        headers,
        requestData,
        protocol,
        timeout
    ) {
        return new Promise((resolve, reject) => {
            const postData = requestData || '';

            /** @type {Object.<string, string>} */
            const requestHeaders = {
                ...headers,
                'Host': host,
                'Content-Length': Buffer.byteLength(postData).toString(),
            };

            let requestString = `${method} ${path} HTTP/1.1\r\n`;
            for (const [key, value] of Object.entries(requestHeaders)) {
                requestString += `${key}: ${value}\r\n`;
            }
            requestString += '\r\n' + postData;

            const socket = new net.Socket();
            socket.setTimeout(timeout);

            socket.on('timeout', () => {
                socket.destroy();
                reject(new Error('Connection timed out'));
            });

            /** @type {{host: string, port: number}} */
            const connectOptions = {
                host: host,
                port: typeof port === 'string' ? parseInt(port, 10) : port,
            };

            const connectCallback = () => {
                /** @type {net.Socket|tls.TLSSocket} */
                let sslSocket;

                if (protocol === 'https') {
                    sslSocket = tls.connect({
                        socket: socket,
                        servername: host,
                    }, () => {
                        sslSocket.write(requestString);
                    });
                } else {
                    sslSocket = socket;
                    sslSocket.write(requestString);
                }

                let responseData = '';

                sslSocket.on('data', (chunk) => {
                    responseData += chunk.toString();
                    if (responseData.includes('\r\n\r\n')) {
                        const [headersString, body] = responseData.split('\r\n\r\n');
                        const [statusLine, ...headerLines] = headersString.split('\r\n');
                        const statusCode = parseInt(statusLine.split(' ')[1]);

                        /** @type {Object.<string, string>} */
                        const headers = {};
                        for (const line of headerLines) {
                            const [key, value] = line.split(': ');
                            headers[key.toLowerCase()] = value;
                        }

                        resolve({
                            getStatusCode: () => statusCode,
                            getHeaders: () => headers,
                            getRawResponse: () => new String(responseData),
                            toStream: (streamCompleteCallback) => {
                                streamCompleteCallback();
                                return null;
                            },
                            toJSON: () => {
                                return Promise.resolve(JSON.parse(body)).catch(() => {
                                    return Promise.reject(new Error('Failed to parse JSON response'));
                                });
                            },
                        });

                        sslSocket.end();
                    }
                });

                sslSocket.on('end', () => {
                    socket.end();
                });

                sslSocket.on('error', (error) => {
                    reject(error);
                });
            };

            socket.connect(connectOptions, connectCallback);

            socket.on('error', (error) => {
                reject(error);
            });
        });
    }
}

module.exports = { CustomHttpClient };