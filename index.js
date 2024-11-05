const net = require("net");
const tls = require("tls");
const { Readable } = require("stream");

/**
 * @typedef {Object} StripeResponse
 * @property {boolean} ok - Indicates if the request was successful.
 * @property {string} url - The URL of the request.
 * @property {number} status - The HTTP status code of the response.
 * @property {string} statusText - The status message associated with the status code.
 * @property {Object.<string, string>} headers - Object containing response headers with string attributes.
 * @property {boolean} redirected - Indicates if the response was redirected.
 * @property {boolean} bodyUsed - Indicates if the response body has been used.
 */

/**
 * @typedef {Object} HttpClientResponse
 * @property {function(): number} getStatusCode - Get the status code of the response
 * @property {function(): Object.<string, string>} getHeaders - Get the headers of the response
 * @property {function(): StripeResponse} getRawResponse - Get the raw response as a string
 * @property {function(function(): void): Readable} toStream - Convert the response to a stream
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
    /** @private */
    this.requestId = "";
  }

  /**
   * Get the name of the client
   * @returns {string} The name of the client
   */
  getClientName() {
    return "CustomSocketHttpClient";
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
      const postData = requestData || "";

      /** @type {Object.<string, string>} */
      const requestHeaders = {
        ...headers,
        Host: host,
        "Content-Length": Buffer.byteLength(postData).toString(),
      };

      let requestString = `${method} ${path} HTTP/1.1\r\n`;
      for (const [key, value] of Object.entries(requestHeaders)) {
        requestString += `${key}: ${value}\r\n`;
      }
      requestString += "\r\n" + postData;

      const socket = new net.Socket();
      socket.setTimeout(timeout);

      socket.on("timeout", () => {
        socket.destroy();
        reject(new Error("Connection timed out"));
      });

      /** @type {{host: string, port: number}} */
      const connectOptions = {
        host: host,
        port: typeof port === "string" ? parseInt(port, 10) : port,
      };

      const url = `${protocol}://${host}:${port}${path}`;

      const connectCallback = () => {
        /** @type {net.Socket|tls.TLSSocket} */
        let sslSocket;

        if (protocol === "https") {
          sslSocket = tls.connect(
            {
              socket: socket,
              servername: host,
            },
            () => {
              sslSocket.write(requestString);
            }
          );
        } else {
          sslSocket = socket;
          sslSocket.write(requestString);
        }

        let responseData = Buffer.alloc(0);
        /** @type {Object.<string, string>} */
        let headers = {};
        let statusCode = 0;
        let isHeadersParsed = false;
        let contentLength = -1;
        let chunkedTransfer = false;

        sslSocket.on("data", (chunk) => {
          responseData = Buffer.concat([responseData, chunk]);

          if (!isHeadersParsed) {
            const headerEndIndex = responseData.indexOf("\r\n\r\n");
            if (headerEndIndex !== -1) {
              const headersString = responseData
                .slice(0, headerEndIndex)
                .toString();
              const [statusLine, ...headerLines] = headersString.split("\r\n");
              statusCode = parseInt(statusLine.split(" ")[1]);

              for (const line of headerLines) {
                const [key, value] = line.split(": ");
                headers[key.toLowerCase()] = value;
              }

              isHeadersParsed = true;
              chunkedTransfer = headers["transfer-encoding"] === "chunked";
              contentLength = parseInt(headers["content-length"] || "-1");

              responseData = responseData.slice(headerEndIndex + 4);

              if (
                !chunkedTransfer &&
                (contentLength === -1 || responseData.length >= contentLength)
              ) {
                sslSocket.end();
                resolve(
                  createResponse(
                    url,
                    statusCode,
                    headers,
                    responseData.toString()
                  )
                );
              }
            }
          } else if (
            contentLength !== -1 &&
            responseData.length >= contentLength
          ) {
            sslSocket.end();
            resolve(
              createResponse(url, statusCode, headers, responseData.toString())
            );
          }
        });

        sslSocket.on("end", () => {
          if (!isHeadersParsed || (contentLength === -1 && !chunkedTransfer)) {
            resolve(
              createResponse(url, statusCode, headers, responseData.toString())
            );
          }
          socket.end();
        });

        sslSocket.on("error", (error) => {
          reject(error);
        });
      };

      socket.connect(connectOptions, connectCallback);

      socket.on("error", (error) => {
        reject(error);
      });
    });
  }
}

const statusCodeToText = {
  100: "Continue",
  101: "Switching Protocols",
  102: "Processing",
  103: "Early Hints",
  200: "OK",
  201: "Created",
  202: "Accepted",
  203: "Non-Authoritative Information",
  204: "No Content",
  205: "Reset Content",
  206: "Partial Content",
  207: "Multi-Status",
  208: "Already Reported",
  226: "IM Used",
  300: "Multiple Choices",
  301: "Moved Permanently",
  302: "Found",
  303: "See Other",
  304: "Not Modified",
  305: "Use Proxy",
  307: "Temporary Redirect",
  308: "Permanent Redirect",
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Payload Too Large",
  414: "URI Too Long",
  415: "Unsupported Media Type",
  416: "Range Not Satisfiable",
  417: "Expectation Failed",
  418: "I'm a teapot",
  421: "Misdirected Request",
  422: "Unprocessable Entity",
  423: "Locked",
  424: "Failed Dependency",
  425: "Too Early",
  426: "Upgrade Required",
  428: "Precondition Required",
  429: "Too Many Requests",
  431: "Request Header Fields Too Large",
  451: "Unavailable For Legal Reasons",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
  505: "HTTP Version Not Supported",
  506: "Variant Also Negotiates",
  507: "Insufficient Storage",
  508: "Loop Detected",
  510: "Not Extended",
  511: "Network Authentication Required",
};

/**
 * Get the status text for an HTTP status code
 * @param {number} statusCode - The HTTP status code
 * @returns
 */
function getStatusText(statusCode) {
  return statusCodeToText[statusCode] || "Unknown Status";
}

/**
 * Create a response object
 * @param {string} url - The URL of the request
 * @param {number} statusCode - The HTTP status code
 * @param {Object.<string, string>} headers - The response headers
 * @param {StripeResponse} responseData - The response body
 * @returns {HttpClientResponse} The response object
 */
function createResponse(url, statusCode, headers, responseData) {
  return {
    getStatusCode: () => statusCode,
    getHeaders: () => headers,
    getRawResponse: () => {
      return {
        ok: statusCode >= 200 && statusCode < 300,
        url: url,
        status: statusCode,
        statusText: getStatusText(statusCode),
        headers: headers,
        redirected: false,
        bodyUsed: true,
      };
    },
    toStream: (streamCompleteCallback) => {
      const stream = new Readable();
      stream.push(responseData);
      stream.push(null);
      stream.on("end", streamCompleteCallback);
      return stream;
    },
    toJSON: () => {
      try {
        return Promise.resolve(JSON.parse(responseData));
      } catch (error) {
        return Promise.reject(new Error("Failed to parse JSON response"));
      }
    },
  };
}

module.exports = { CustomHttpClient };
