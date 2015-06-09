"use strict";

var assert = require('assert');

var sec = module.exports = exports = {};

// Role constant
sec.OWNER = "$owner"; // owner of the object
sec.RELATED = "$related"; // any User with a relationship to the object
sec.AUTHENTICATED = "$authenticated"; // authenticated user
sec.UNAUTHENTICATED = "$unauthenticated"; // authenticated user
sec.EVERYONE = "$everyone"; // everyone

sec.ALL = "*";

sec.DEFAULT = "DEFAULT"; // Not specified
sec.ALLOW = "ALLOW"; // Allow
sec.ALARM = "ALARM"; // Warn - send an alarm
sec.AUDIT = "AUDIT"; // Audit - record the access
sec.DENY = "DENY"; // Deny

sec.READ = "READ"; // Read operation
sec.WRITE = "WRITE"; // Write operation
sec.EXECUTE = "EXECUTE"; // Execute operation

sec.USER = "USER";
sec.APP = sec.APPLICATION = "APP";
sec.ROLE = "ROLE";
sec.SCOPE = "SCOPE";

sec.getAccessTypeForMethod = function getAccessTypeForMethod(method) {
    if (typeof method === 'string') {
        method = {name: method};
    }
    assert(typeof method === 'object', 'method is a required argument and must be a RemoteMethod object');

    switch (method.name) {
        case'create':
            return sec.WRITE;
        case 'updateOrCreate':
            return sec.WRITE;
        case 'upsert':
            return sec.WRITE;
        case 'exists':
            return sec.READ;
        case 'all':
            return sec.READ;
        case 'findById':
            return sec.READ;
        case 'find':
            return sec.READ;
        case 'findOne':
            return sec.READ;
        case 'one':
            return sec.READ;
        case 'destroyById':
            return sec.WRITE;
        case 'deleteById':
            return sec.WRITE;
        case 'removeById':
            return sec.WRITE;
        case 'count':
            return sec.READ;
            break;
        default:
            return sec.EXECUTE;
            break;
    }
};