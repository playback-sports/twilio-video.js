"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/**
 * Copyright (c) 2013 Tim Perry
 * Licensed under the MIT license.
 *
 * Copied from https://github.com/pimterry/loglevel (1.7.0)
 * and modified to remove browser and AMD module support, while keeping CommonJS.
 * It was causing a conflict when this is bundled using CommonJS, and then loaded via RequireJS.
 * The proper way to fix this module is to have a build that outputs CommonJS and AMD separately
 * which needs to be submitted to the original module's repo.
 */

/* istanbul ignore file */
/* eslint-disable */
// Slightly dubious tricks to cut down minimized file size
var noop = function noop() {};
var undefinedType = "undefined";
var isIE = (typeof window === "undefined" ? "undefined" : _typeof(window)) !== undefinedType && _typeof(window.navigator) !== undefinedType && /Trident\/|MSIE /.test(window.navigator.userAgent);

var logMethods = ["trace", "debug", "info", "warn", "error"];

// Cross-browser bind equivalent that works at least back to IE6
function bindMethod(obj, methodName) {
    var method = obj[methodName];
    if (typeof method.bind === 'function') {
        return method.bind(obj);
    } else {
        try {
            return Function.prototype.bind.call(method, obj);
        } catch (e) {
            // Missing bind shim or IE8 + Modernizr, fallback to wrapping
            return function () {
                return Function.prototype.apply.apply(method, [obj, arguments]);
            };
        }
    }
}

// Trace() doesn't print the message in IE, so for that case we need to wrap it
function traceForIE() {
    if (console.log) {
        if (console.log.apply) {
            console.log.apply(console, arguments);
        } else {
            // In old IE, native console methods themselves don't have apply().
            Function.prototype.apply.apply(console.log, [console, arguments]);
        }
    }
    if (console.trace) console.trace();
}

// Build the best logging method possible for this env
// Wherever possible we want to bind, not wrap, to preserve stack traces
function realMethod(methodName) {
    if (methodName === 'debug') {
        methodName = 'log';
    }

    if ((typeof console === "undefined" ? "undefined" : _typeof(console)) === undefinedType) {
        return false; // No method possible, for now - fixed later by enableLoggingWhenConsoleArrives
    } else if (methodName === 'trace' && isIE) {
        return traceForIE;
    } else if (console[methodName] !== undefined) {
        return bindMethod(console, methodName);
    } else if (console.log !== undefined) {
        return bindMethod(console, 'log');
    } else {
        return noop;
    }
}

// These private functions always need `this` to be set properly

function replaceLoggingMethods(level, loggerName) {
    /*jshint validthis:true */
    for (var i = 0; i < logMethods.length; i++) {
        var methodName = logMethods[i];
        this[methodName] = i < level ? noop : this.methodFactory(methodName, level, loggerName);
    }

    // Define log.log as an alias for log.debug
    this.log = this.debug;
}

// In old IE versions, the console isn't present until you first open it.
// We build realMethod() replacements here that regenerate logging methods
function enableLoggingWhenConsoleArrives(methodName, level, loggerName) {
    return function () {
        if ((typeof console === "undefined" ? "undefined" : _typeof(console)) !== undefinedType) {
            replaceLoggingMethods.call(this, level, loggerName);
            this[methodName].apply(this, arguments);
        }
    };
}

// By default, we use closely bound real methods wherever possible, and
// otherwise we wait for a console to appear, and then try again.
function defaultMethodFactory(methodName, level, loggerName) {
    /*jshint validthis:true */
    return realMethod(methodName) || enableLoggingWhenConsoleArrives.apply(this, arguments);
}

function Logger(name, defaultLevel, factory) {
    var self = this;
    var currentLevel;

    var storageKey = "loglevel";
    if (typeof name === "string") {
        storageKey += ":" + name;
    } else if ((typeof name === "undefined" ? "undefined" : _typeof(name)) === "symbol") {
        storageKey = undefined;
    }

    function persistLevelIfPossible(levelNum) {
        var levelName = (logMethods[levelNum] || 'silent').toUpperCase();

        if ((typeof window === "undefined" ? "undefined" : _typeof(window)) === undefinedType || !storageKey) return;

        // Use localStorage if available
        try {
            window.localStorage[storageKey] = levelName;
            return;
        } catch (ignore) {}

        // Use session cookie as fallback
        try {
            window.document.cookie = encodeURIComponent(storageKey) + "=" + levelName + ";";
        } catch (ignore) {}
    }

    function getPersistedLevel() {
        var storedLevel;

        if ((typeof window === "undefined" ? "undefined" : _typeof(window)) === undefinedType || !storageKey) return;

        try {
            storedLevel = window.localStorage[storageKey];
        } catch (ignore) {}

        // Fallback to cookies if local storage gives us nothing
        if ((typeof storedLevel === "undefined" ? "undefined" : _typeof(storedLevel)) === undefinedType) {
            try {
                var cookie = window.document.cookie;
                var location = cookie.indexOf(encodeURIComponent(storageKey) + "=");
                if (location !== -1) {
                    storedLevel = /^([^;]+)/.exec(cookie.slice(location))[1];
                }
            } catch (ignore) {}
        }

        // If the stored level is not valid, treat it as if nothing was stored.
        if (self.levels[storedLevel] === undefined) {
            storedLevel = undefined;
        }

        return storedLevel;
    }

    /*
     *
     * Public logger API - see https://github.com/pimterry/loglevel for details
     *
     */

    self.name = name;

    self.levels = { "TRACE": 0, "DEBUG": 1, "INFO": 2, "WARN": 3,
        "ERROR": 4, "SILENT": 5 };

    self.methodFactory = factory || defaultMethodFactory;

    self.getLevel = function () {
        return currentLevel;
    };

    self.setLevel = function (level, persist) {
        if (typeof level === "string" && self.levels[level.toUpperCase()] !== undefined) {
            level = self.levels[level.toUpperCase()];
        }
        if (typeof level === "number" && level >= 0 && level <= self.levels.SILENT) {
            currentLevel = level;
            if (persist !== false) {
                // defaults to true
                persistLevelIfPossible(level);
            }
            replaceLoggingMethods.call(self, level, name);
            if ((typeof console === "undefined" ? "undefined" : _typeof(console)) === undefinedType && level < self.levels.SILENT) {
                return "No console available for logging";
            }
        } else {
            throw "log.setLevel() called with invalid level: " + level;
        }
    };

    self.setDefaultLevel = function (level) {
        if (!getPersistedLevel()) {
            self.setLevel(level, false);
        }
    };

    self.enableAll = function (persist) {
        self.setLevel(self.levels.TRACE, persist);
    };

    self.disableAll = function (persist) {
        self.setLevel(self.levels.SILENT, persist);
    };

    // Initialize with the right level
    var initialLevel = getPersistedLevel();
    if (initialLevel == null) {
        initialLevel = defaultLevel == null ? "WARN" : defaultLevel;
    }
    self.setLevel(initialLevel, false);
}

/*
 *
 * Top-level API
 *
 */

var defaultLogger = new Logger();

var _loggersByName = {};
defaultLogger.getLogger = function getLogger(name) {
    if ((typeof name === "undefined" ? "undefined" : _typeof(name)) !== "symbol" && typeof name !== "string" || name === "") {
        throw new TypeError("You must supply a name when creating a logger.");
    }

    var logger = _loggersByName[name];
    if (!logger) {
        logger = _loggersByName[name] = new Logger(name, defaultLogger.getLevel(), defaultLogger.methodFactory);
    }
    return logger;
};

// Grab the current global log variable in case of overwrite
var _log = (typeof window === "undefined" ? "undefined" : _typeof(window)) !== undefinedType ? window.log : undefined;
defaultLogger.noConflict = function () {
    if ((typeof window === "undefined" ? "undefined" : _typeof(window)) !== undefinedType && window.log === defaultLogger) {
        window.log = _log;
    }

    return defaultLogger;
};

defaultLogger.getLoggers = function getLoggers() {
    return _loggersByName;
};

// ES6 default export, for compatibility
defaultLogger['default'] = defaultLogger;

module.exports = defaultLogger;