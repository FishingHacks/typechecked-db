"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = __importDefault(require("../../../src/client/"));
const modelObjects_1 = require("./modelObjects");
class Client {
    constructor(config) {
        this.provider = { "provider": "enmap" };
        config ||= {};
        this.disabledMiddleware = !!config.disableMiddleware;
        const client = new client_1.default({ "provider": "enmap" });
        this.client = client;
        this.post = { create(model) { return client.$create(modelObjects_1.Post, model, "Post"); }, find(query) { return client.$findMany(modelObjects_1.Post, query, "Post"); }, findOne(query) { return client.$findOne(modelObjects_1.Post, query, "Post"); }, findOneAndDelete(query) { return client.$delete(modelObjects_1.Post, query, "Post"); }, findOneAndUpdate(query, model) { return client.$update(modelObjects_1.Post, query, model, "Post"); }, clear() { return client.$clear("Post"); } };
        this.user = { create(model) { return client.$create(modelObjects_1.User, model, "User"); }, find(query) { return client.$findMany(modelObjects_1.User, query, "User"); }, findOne(query) { return client.$findOne(modelObjects_1.User, query, "User"); }, findOneAndDelete(query) { return client.$delete(modelObjects_1.User, query, "User"); }, findOneAndUpdate(query, model) { return client.$update(modelObjects_1.User, query, model, "User"); }, clear() { return client.$clear("User"); } };
    }
    $use(fn) {
        if (this.disabledMiddleware)
            throw new Error("Middleware isn't enabled");
        return this.client.$use(fn);
    }
    $connect() { return this.client.$connect(); }
    ;
    $disconnect() { return this.client.$disconnect(); }
    ;
    get isConnected() { return this.client.isConnected; }
    ;
}
exports.default = Client;
