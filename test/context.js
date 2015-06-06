"use strict";

var sycle = require('../');

exports = module.exports = function (req) {
    return sycle().createContext(req);
};