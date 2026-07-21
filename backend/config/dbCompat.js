const { MongoClient, ObjectId } = require('mongodb');
const { AsyncLocalStorage } = require('node:async_hooks');

// Cache MongoClient connection
const dbStorage = new AsyncLocalStorage();
let clientInstance = null;
let dbInstance = null;
let activeEnv = null;

async function getDB(env) {
    const active = env || activeEnv || {};
    const mongodbUri = active.MONGODB_URI || process.env.MONGODB_URI;
    const dbName = active.DB_NAME || process.env.DB_NAME || 'tom-ai-db';

    if (!mongodbUri) {
        throw new Error('MONGODB_URI is not defined!');
    }

    const store = dbStorage.getStore();
    if (store) {
        if (store.db) return store.db;

        const client = new MongoClient(mongodbUri, {
            connectTimeoutMS: 5000,
            socketTimeoutMS: 5000,
            serverSelectionTimeoutMS: 5000,
            maxPoolSize: 1
        });
        await client.connect();
        const db = client.db(dbName);
        store.db = db;
        store.client = client;
        return db;
    }

    if (dbInstance) {
        try {
            await dbInstance.command({ ping: 1 }, { maxTimeMS: 1000 });
            return dbInstance;
        } catch (e) {
            console.warn('⚠️ MongoDB connection ping failed, reconnecting:', e.message);
            dbInstance = null;
            clientInstance = null;
        }
    }

    clientInstance = new MongoClient(mongodbUri, {
        connectTimeoutMS: 5000,
        socketTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 1
    });
    await clientInstance.connect();
    dbInstance = clientInstance.db(dbName);
    return dbInstance;
}

function setGlobalEnv(env) {
    activeEnv = env;
    if (env && typeof env === 'object') {
        process.env = process.env || {};
        for (const [k, v] of Object.entries(env)) {
            if (typeof v === 'string') {
                process.env[k] = v;
            }
        }
    }
}

const collectionMap = {
    'User': 'users',
    'TempOTP': 'tempotps',
    'Task': 'tasks',
    'Reminder': 'reminders',
    'ChatHistory': 'chathistories',
    'PersonalDocument': 'personaldocuments',
    'VectorDocument': 'vectordocuments'
};

async function getCollection(modelName) {
    let envToUse = activeEnv;
    if (!envToUse) {
        envToUse = process.env;
    }
    const db = await getDB(envToUse);
    const colName = collectionMap[modelName] || modelName.toLowerCase() + 's';
    return db.collection(colName);
}

const castToObjectId = (value) => {
    if (typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)) {
        return new ObjectId(value);
    }
    return value;
};

const castIds = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    if (obj instanceof ObjectId || obj instanceof Date) return obj;

    if (Array.isArray(obj)) {
        return obj.map(castIds);
    }

    const res = {};
    for (const [k, v] of Object.entries(obj)) {
        const lowerK = k.toLowerCase();
        if (v && typeof v === 'object' && !(v instanceof Date) && !(v instanceof ObjectId)) {
            res[k] = castIds(v);
        } else if (lowerK === '_id' || lowerK.endsWith('id') || lowerK === 'id' || lowerK.includes('id.')) {
            if (Array.isArray(v)) {
                res[k] = v.map(castToObjectId);
            } else {
                res[k] = castToObjectId(v);
            }
        } else {
            res[k] = v;
        }
    }
    return res;
};

const sanitizeQueryObj = (query) => {
    if (!query || typeof query !== 'object') return query;
    if (query instanceof ObjectId || query instanceof Date) return query;

    const newQuery = Array.isArray(query) ? [] : {};
    for (const [key, val] of Object.entries(query)) {
        const lowerKey = key.toLowerCase();
        if (val && typeof val === 'object' && !(val instanceof Date) && !(val instanceof ObjectId)) {
            newQuery[key] = sanitizeQueryObj(val);
        } else if (
            ['_id', 'userId', 'taskId', 'metadata.fileId', 'metadata.sourceId'].includes(key) ||
            lowerKey.endsWith('id') ||
            lowerKey === 'id' ||
            lowerKey.includes('id.') ||
            (key === '$in' && Array.isArray(val))
        ) {
            if (Array.isArray(val)) {
                newQuery[key] = val.map(castToObjectId);
            } else {
                newQuery[key] = castToObjectId(val);
            }
        } else {
            newQuery[key] = val;
        }
    }
    return newQuery;
};

class MongoDocument {
    constructor(raw, model, isFromDb = false) {
        Object.assign(this, raw);

        // Apply schema default values for new documents
        if (!isFromDb && model && model.schema && model.schema.fields) {
            for (const [fieldName, fieldDef] of Object.entries(model.schema.fields)) {
                if (this[fieldName] === undefined && fieldDef && typeof fieldDef === 'object') {
                    if (typeof fieldDef.default === 'function') {
                        this[fieldName] = fieldDef.default();
                    } else if (fieldDef.default !== undefined) {
                        this[fieldName] = fieldDef.default;
                    }
                }
            }
        }

        Object.defineProperty(this, '_raw', { value: isFromDb ? { ...this } : {}, writable: true, enumerable: false });
        Object.defineProperty(this, '_isNew', { value: !isFromDb, writable: true, enumerable: false });
        Object.defineProperty(this, '_model', { value: model, writable: true, enumerable: false });

        // Bind methods from schema.methods
        const methods = model.schema.methods || {};
        for (const [methodName, fn] of Object.entries(methods)) {
            this[methodName] = fn.bind(this);
        }
    }

    get isNew() {
        return this._isNew;
    }

    set isNew(val) {
        this._isNew = val;
    }

    toObject() {
        const obj = {};
        for (const [k, v] of Object.entries(this)) {
            if (typeof v !== 'function') {
                obj[k] = v;
            }
        }
        return obj;
    }

    toJSON() {
        if (this._model.schema.methods.toJSON) {
            return this._model.schema.methods.toJSON.call(this);
        }
        return this.toObject();
    }

    isModified(path) {
        return this[path] !== this._raw[path];
    }

    async save(options = {}) {
        const col = await this._model.getCollection();

        // Execute pre-save hooks
        const preHooks = this._model.schema._hooks.pre['save'] || [];
        for (const hook of preHooks) {
            let callbackCalled = false;
            await new Promise(async (resolve, reject) => {
                const next = (err) => {
                    if (callbackCalled) return;
                    callbackCalled = true;
                    if (err) reject(err);
                    else resolve();
                };

                try {
                    const p = hook.call(this, next);
                    if (p && typeof p.then === 'function') {
                        await p;
                        if (!callbackCalled) {
                            callbackCalled = true;
                            resolve();
                        }
                    }
                } catch (e) {
                    if (!callbackCalled) {
                        callbackCalled = true;
                        reject(e);
                    }
                }
            });
        }

        // Build dataToSave removing dynamic bound schema functions
        let dataToSave = {};
        for (const [k, v] of Object.entries(this)) {
            if (typeof v !== 'function') {
                dataToSave[k] = v;
            }
        }
        dataToSave = castIds(dataToSave);

        if (this._model.schema.options.timestamps) {
            const now = new Date();
            if (!this.createdAt) {
                this.createdAt = now;
                dataToSave.createdAt = now;
            }
            this.updatedAt = now;
            dataToSave.updatedAt = now;
        }

        if (this._id) {
            const _id = typeof this._id === 'string' ? new ObjectId(this._id) : this._id;
            const updateData = { ...dataToSave };
            delete updateData._id;
            await col.updateOne({ _id }, { $set: updateData }, { upsert: true });
        } else {
            const res = await col.insertOne(dataToSave);
            this._id = res.insertedId;
            dataToSave._id = res.insertedId;
        }

        this._raw = { ...dataToSave };
        this._isNew = false;

        const postHooks = this._model.schema._hooks.post['save'] || [];
        for (const hook of postHooks) {
            await hook.call(this);
        }

        return this;
    }
}

class QueryChain {
    constructor(colPromise, query, isFind, model) {
        this._colPromise = colPromise;
        this._query = query;
        this._isFind = isFind;
        this._model = model;

        this._sort = null;
        this._skip = null;
        this._limit = null;
        this._lean = false;
        this._populatePaths = [];
        this._projection = null;
    }

    sort(sortObj) {
        this._sort = sortObj;
        return this;
    }

    skip(skipNum) {
        this._skip = skipNum;
        return this;
    }

    limit(limitNum) {
        this._limit = limitNum;
        return this;
    }

    populate(path, select) {
        this._populatePaths.push({ path, select });
        return this;
    }

    select(selectParam) {
        if (!selectParam) return this;
        let proj = {};
        if (typeof selectParam === 'string') {
            const fields = selectParam.split(/\s+/).filter(Boolean);
            for (const f of fields) {
                if (f.startsWith('-')) {
                    proj[f.slice(1)] = 0;
                } else {
                    const cleanField = f.startsWith('+') ? f.slice(1) : f;
                    proj[cleanField] = 1;
                }
            }
        } else if (typeof selectParam === 'object') {
            proj = selectParam;
        }
        this._projection = proj;
        return this;
    }

    lean() {
        this._lean = true;
        return this;
    }

    async execute() {
        const col = await this._colPromise;
        let results;

        if (this._isFind) {
            let cursor = col.find(this._query);
            if (this._projection) cursor = cursor.project(this._projection);
            if (this._sort) cursor = cursor.sort(this._sort);
            if (this._skip !== null) cursor = cursor.skip(this._skip);
            if (this._limit !== null) cursor = cursor.limit(this._limit);

            results = await cursor.toArray();
        } else {
            const options = {};
            if (this._projection) options.projection = this._projection;
            results = await col.findOne(this._query, options);
        }

        if (!results) return null;

        const decorateDoc = (rawDoc) => {
            if (this._lean) return rawDoc;
            return new MongoDocument(rawDoc, this._model, true);
        };

        let decorated;
        if (Array.isArray(results)) {
            decorated = results.map(decorateDoc);
        } else {
            decorated = decorateDoc(results);
        }

        if (this._populatePaths.length > 0 && decorated) {
            const docsToPopulate = Array.isArray(decorated) ? decorated : [decorated];
            for (const pop of this._populatePaths) {
                const fieldDef = this._model.schema.fields[pop.path] || {};
                const refModelName = fieldDef.ref;
                if (!refModelName) continue;

                const refModel = modelsRegistry[refModelName];
                if (!refModel) continue;

                const ids = docsToPopulate
                    .map(d => d[pop.path])
                    .filter(id => id !== undefined && id !== null);

                if (ids.length === 0) continue;

                const refDocs = await refModel.find({
                    _id: { $in: ids.map(id => typeof id === 'string' ? new ObjectId(id) : id) }
                }).lean();

                const refMap = new Map();
                for (const rd of refDocs) {
                    refMap.set(rd._id.toString(), rd);
                }

                for (const doc of docsToPopulate) {
                    const val = doc[pop.path];
                    if (val) {
                        const rd = refMap.get(val.toString());
                        if (rd && pop.select) {
                            const selectedKeys = pop.select.split(' ').filter(Boolean);
                            const filteredRd = { _id: rd._id };
                            for (const k of selectedKeys) {
                                filteredRd[k] = rd[k];
                            }
                            doc[pop.path] = filteredRd;
                        } else if (rd) {
                            doc[pop.path] = rd;
                        }
                    }
                }
            }
        }

        return decorated;
    }

    then(onfulfilled, onrejected) {
        return this.execute().then(onfulfilled, onrejected);
    }

    catch(onrejected) {
        return this.execute().catch(onrejected);
    }
}

const modelsRegistry = {};

class ModelCompat {
    constructor(name, schema) {
        this.name = name;
        this.schema = schema;
        modelsRegistry[name] = this;
    }

    async getCollection() {
        return getCollection(this.name);
    }

    constructorFn(data) {
        return new MongoDocument(data, this);
    }

    find(query) {
        const sanitized = sanitizeQueryObj(query);
        return new QueryChain(this.getCollection(), sanitized, true, this);
    }

    findOne(query) {
        const sanitized = sanitizeQueryObj(query);
        return new QueryChain(this.getCollection(), sanitized, false, this);
    }

    findById(id) {
        return this.findOne({ _id: id });
    }

    async create(docOrDocs) {
        const isArray = Array.isArray(docOrDocs);
        const docs = isArray ? docOrDocs : [docOrDocs];

        const decoratedDocs = [];
        for (const data of docs) {
            const doc = new MongoDocument(data, this);
            await doc.save();
            decoratedDocs.push(doc);
        }
        return isArray ? decoratedDocs : decoratedDocs[0];
    }

    async deleteOne(query) {
        const col = await this.getCollection();
        const sanitized = sanitizeQueryObj(query);
        return col.deleteOne(sanitized);
    }

    async deleteMany(query) {
        const col = await this.getCollection();
        const sanitized = sanitizeQueryObj(query);
        return col.deleteMany(sanitized);
    }

    async countDocuments(query) {
        const col = await this.getCollection();
        const sanitized = sanitizeQueryObj(query);
        return col.countDocuments(sanitized);
    }

    async updateOne(query, update, options = {}) {
        const col = await this.getCollection();
        const sanitizedQuery = sanitizeQueryObj(query);
        const sanitizedUpdate = castIds(update);
        return col.updateOne(sanitizedQuery, sanitizedUpdate, options);
    }

    async updateMany(query, update, options = {}) {
        const col = await this.getCollection();
        const sanitizedQuery = sanitizeQueryObj(query);
        const sanitizedUpdate = castIds(update);
        return col.updateMany(sanitizedQuery, sanitizedUpdate, options);
    }

    async findByIdAndUpdate(id, update, options = {}) {
        return this.findOneAndUpdate({ _id: id }, update, options);
    }

    async findOneAndUpdate(query, update, options = {}) {
        const col = await this.getCollection();
        const sanitizedQuery = sanitizeQueryObj(query);

        const returnDocument = options.new ? 'after' : 'before';
        let mongoUpdate = update;
        const hasModifiers = Object.keys(update).some(k => k.startsWith('$'));
        if (!hasModifiers) {
            mongoUpdate = { $set: update };
        }
        const sanitizedUpdate = castIds(mongoUpdate);

        const res = await col.findOneAndUpdate(sanitizedQuery, sanitizedUpdate, {
            returnDocument,
            upsert: options.upsert || false,
        });

        if (!res) return null;
        return new MongoDocument(res, this, true);
    }
}

class Schema {
    constructor(fields, options = {}) {
        this.fields = fields;
        this.options = options;
        this.methods = {};
        this._hooks = { pre: {}, post: {} };
    }
    index() { }
    pre(event, fn) {
        this._hooks.pre[event] = this._hooks.pre[event] || [];
        this._hooks.pre[event].push(fn);
    }
    post(event, fn) {
        this._hooks.post[event] = this._hooks.post[event] || [];
        this._hooks.post[event].push(fn);
    }
}

Schema.Types = {
    ObjectId: 'ObjectId',
    Mixed: 'Mixed',
};

const mongooseCompat = {
    Schema,
    Types: {
        ObjectId,
        Mixed: 'Mixed',
    },
    model(name, schema) {
        if (modelsRegistry[name]) return modelsRegistry[name];
        const newModel = new ModelCompat(name, schema);

        const ModelClass = function (data) {
            return newModel.constructorFn(data);
        };

        Object.setPrototypeOf(ModelClass, newModel);

        // Set prototype of instances to Document
        Object.setPrototypeOf(ModelClass.prototype, MongoDocument.prototype);

        modelsRegistry[name] = ModelClass;
        return ModelClass;
    },
    connect: async (uri, options) => {
        if (dbInstance) {
            try {
                await dbInstance.command({ ping: 1 }, { maxTimeMS: 1000 });
                return {
                    connection: {
                        host: new URL(uri).hostname,
                    }
                };
            } catch (e) {
                dbInstance = null;
                clientInstance = null;
            }
        }
        const client = new MongoClient(uri, {
            connectTimeoutMS: 5000,
            socketTimeoutMS: 5000,
            serverSelectionTimeoutMS: 5000,
            maxPoolSize: 1
        });
        await client.connect();
        clientInstance = client;
        const dbName = options?.dbName || activeEnv?.DB_NAME || process.env.DB_NAME || 'tom-ai-db';
        dbInstance = client.db(dbName);
        return {
            connection: {
                host: new URL(uri).hostname,
            }
        };
    },
    connection: {
        on: () => { },
    },
    setGlobalEnv,
    getDB,
    dbStorage
};

module.exports = mongooseCompat;
