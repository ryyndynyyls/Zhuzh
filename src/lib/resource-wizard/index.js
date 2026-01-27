"use strict";
/**
 * Resource Wizard - Voice Command System
 *
 * Natural language interface for managing allocations
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wizardDebug = exports.generateProactiveOpener = exports.formatResponse = exports.celebrate = exports.softError = exports.getTransition = exports.getAcknowledgment = exports.selectTone = exports.evaluateAdvisory = exports.generateInsights = exports.classifyRequest = exports.previewActions = exports.executeActions = exports.getProjectStatus = exports.getUserAvailability = exports.searchProjects = exports.searchUsers = exports.buildResourceWizardContext = exports.continueConversation = exports.processCommand = void 0;
// Types
__exportStar(require("./types"), exports);
// Core functions
var agent_1 = require("./agent");
Object.defineProperty(exports, "processCommand", { enumerable: true, get: function () { return agent_1.processCommand; } });
Object.defineProperty(exports, "continueConversation", { enumerable: true, get: function () { return agent_1.continueConversation; } });
var context_builder_1 = require("./context-builder");
Object.defineProperty(exports, "buildResourceWizardContext", { enumerable: true, get: function () { return context_builder_1.buildResourceWizardContext; } });
Object.defineProperty(exports, "searchUsers", { enumerable: true, get: function () { return context_builder_1.searchUsers; } });
Object.defineProperty(exports, "searchProjects", { enumerable: true, get: function () { return context_builder_1.searchProjects; } });
Object.defineProperty(exports, "getUserAvailability", { enumerable: true, get: function () { return context_builder_1.getUserAvailability; } });
Object.defineProperty(exports, "getProjectStatus", { enumerable: true, get: function () { return context_builder_1.getProjectStatus; } });
var action_executor_1 = require("./action-executor");
Object.defineProperty(exports, "executeActions", { enumerable: true, get: function () { return action_executor_1.executeActions; } });
Object.defineProperty(exports, "previewActions", { enumerable: true, get: function () { return action_executor_1.previewActions; } });
// New engines (Voice Overhaul)
var classifier_1 = require("./classifier");
Object.defineProperty(exports, "classifyRequest", { enumerable: true, get: function () { return classifier_1.classifyRequest; } });
var insight_engine_1 = require("./insight-engine");
Object.defineProperty(exports, "generateInsights", { enumerable: true, get: function () { return insight_engine_1.generateInsights; } });
var advisory_engine_1 = require("./advisory-engine");
Object.defineProperty(exports, "evaluateAdvisory", { enumerable: true, get: function () { return advisory_engine_1.evaluateAdvisory; } });
var personality_1 = require("./personality");
Object.defineProperty(exports, "selectTone", { enumerable: true, get: function () { return personality_1.selectTone; } });
Object.defineProperty(exports, "getAcknowledgment", { enumerable: true, get: function () { return personality_1.getAcknowledgment; } });
Object.defineProperty(exports, "getTransition", { enumerable: true, get: function () { return personality_1.getTransition; } });
Object.defineProperty(exports, "softError", { enumerable: true, get: function () { return personality_1.softError; } });
Object.defineProperty(exports, "celebrate", { enumerable: true, get: function () { return personality_1.celebrate; } });
Object.defineProperty(exports, "formatResponse", { enumerable: true, get: function () { return personality_1.formatResponse; } });
Object.defineProperty(exports, "generateProactiveOpener", { enumerable: true, get: function () { return personality_1.generateProactiveOpener; } });
// Debug utilities
var debug_1 = require("./debug");
Object.defineProperty(exports, "wizardDebug", { enumerable: true, get: function () { return debug_1.wizardDebug; } });
