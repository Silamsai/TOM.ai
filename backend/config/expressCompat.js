const { Hono } = require('hono');

const toHonoHandler = (expressHandler) => {
    // If this is middleware (3 params) or endpoint handler (3 params with next)
    if (typeof expressHandler !== 'function') return expressHandler;

    return async (c, honoNext) => {
        // Create the req compatibility object
        const req = {
            body: {},
            query: c.req.query(),
            params: c.req.param(),
            headers: c.req.header(),
            method: c.req.method,
            path: c.req.path,
            get userId() { return c.get('userId'); },
            set userId(val) { c.set('userId', val); },
            get userEmail() { return c.get('userEmail'); },
            set userEmail(val) { c.set('userEmail', val); },
            file: null,
            get(headerName) {
                return c.req.header(headerName);
            },
            waitUntil(promise) {
                if (c.executionCtx && typeof c.executionCtx.waitUntil === 'function') {
                    c.executionCtx.waitUntil(promise);
                }
            }
        };

        // Retrieve and parse body content
        const contentType = c.req.header('content-type') || '';
        if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
            try {
                if (contentType.includes('application/json')) {
                    req.body = await c.req.json();
                } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
                    const body = await c.req.parseBody();
                    req.body = body;
                    if (body.file) {
                        const fileObj = body.file;
                        // Native File object in Workers
                        const arrayBuf = await fileObj.arrayBuffer();
                        req.file = {
                            originalname: fileObj.name || 'document',
                            size: fileObj.size,
                            mimetype: fileObj.type,
                            buffer: Buffer.from(arrayBuf)
                        };
                    }
                }
            } catch (e) {
                // Body reading can sometimes fail on empty request bodies
            }
        }

        // Response adapter
        let responseSent = false;
        let resolvePromise;
        const promise = new Promise((resolve) => { resolvePromise = resolve; });

        let headers = {};
        let status = 200;
        let responseObj = null;

        const res = {
            status(code) {
                status = code;
                return this;
            },
            setHeader(name, value) {
                headers[name] = value;
                return this;
            },
            json(data) {
                if (responseSent) return;
                responseSent = true;
                Object.entries(headers).forEach(([k, v]) => c.header(k, v));
                responseObj = c.json(data, status);
                resolvePromise();
            },
            send(data) {
                if (responseSent) return;
                responseSent = true;
                Object.entries(headers).forEach(([k, v]) => c.header(k, v));
                responseObj = c.body(data, status);
                resolvePromise();
            }
        };

        // Next adapter
        let nextCalled = false;
        let nextError = null;
        const next = (err) => {
            nextCalled = true;
            nextError = err;
            resolvePromise();
        };

        try {
            const result = expressHandler(req, res, next);
            if (result && typeof result.then === 'function') {
                await result;
            }
            await promise;
        } catch (err) {
            nextError = err;
            nextCalled = true;
            resolvePromise();
        }

        if (nextCalled) {
            if (nextError) {
                throw nextError;
            }
            if (honoNext) {
                await honoNext();
            }
            return;
        }

        return responseObj;
    };
};

class ExpressRouterMock {
    constructor() {
        this.honoRoutes = [];
    }

    use(...args) {
        let path = '*';
        let handlers = args;
        if (typeof args[0] === 'string') {
            path = args[0];
            handlers = args.slice(1);
        }

        // Convert express wildcard * to hono *
        const honoPath = path === '/*' ? '*' : path;

        this.honoRoutes.push({ method: 'use', path: honoPath, handlers });
    }

    get(path, ...handlers) {
        this.honoRoutes.push({ method: 'get', path, handlers });
    }

    post(path, ...handlers) {
        this.honoRoutes.push({ method: 'post', path, handlers });
    }

    put(path, ...handlers) {
        this.honoRoutes.push({ method: 'put', path, handlers });
    }

    patch(path, ...handlers) {
        this.honoRoutes.push({ method: 'patch', path, handlers });
    }

    delete(path, ...handlers) {
        this.honoRoutes.push({ method: 'delete', path, handlers });
    }
}

const expressCompat = {
    Router() {
        return new ExpressRouterMock();
    },
    json() {
        return (req, res, next) => next();
    },
    urlencoded() {
        return (req, res, next) => next();
    },
    toHonoHandler,
    ExpressRouterMock
};

module.exports = expressCompat;
