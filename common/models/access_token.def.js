"use strict";

var DEFAULT_TTL = 1209600; // 2 weeks in seconds

module.exports = {
    name: 'AccessToken',
    properties: {
        id: { type: String, index: true },
        ttl: { type: Number, default: DEFAULT_TTL },
        created: {type: Date, default: function () { return new Date;}},

        // foreign keys
        userId: String
    },
    relations: {
        user: {
            type: 'belongsTo',
            model: 'User',
            foreignKey: 'userId'
        }
    }

};