import { Socket } from 'net';
import { TLSSocket } from 'tls';

export interface HttpClientResponse {
    getStatusCode(): number;
    getHeaders(): { [key: string]: string };
    getRawResponse(): string;
    toStream(streamCompleteCallback: () => void): null;
    toJSON(): Promise<any>;
}

export type HttpProtocol = 'http' | 'https';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export class CustomHttpClient {
    requestId: string;

    constructor();

    getClientName(): string;

    makeRequest(
        host: string,
        port: string | number,
        path: string,
        method: HttpMethod,
        headers: { [key: string]: string },
        requestData: string | null,
        protocol: HttpProtocol,
        timeout: number
    ): Promise<HttpClientResponse>;
}

export interface ConnectOptions {
    host: string;
    port: number;
}

export type SSLSocket = Socket | TLSSocket;