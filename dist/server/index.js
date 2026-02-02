"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("./config"));
const services_1 = __importDefault(require("./services"));
const controllers_1 = __importDefault(require("./controllers"));
const routes_1 = __importDefault(require("./routes"));
const bootstrap_1 = __importDefault(require("./bootstrap"));
exports.default = {
    config: config_1.default,
    services: services_1.default,
    controllers: controllers_1.default,
    routes: routes_1.default,
    bootstrap: bootstrap_1.default,
};
//# sourceMappingURL=index.js.map