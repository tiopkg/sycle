"use strict";

module.exports = function () {
    return {
        properties: {
            name: {type: String, index: true, required: true},
            description: String
        }
    }
};