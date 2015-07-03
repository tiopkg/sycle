"use strict";

var sec = require('../../lib/security');

module.exports = {
    hidden: ['password'],
    uuid: 'v4',
    properties: {
        id: {type: String, index: true},
        realm: {type: String},
        username: {type: String, index: true},
        email: {type: String, index: true},
        nickname: {type: String},
        password: {type: String},
        emailVerified: Boolean,
        verificationToken: String,
        status: String,
        // Timestamps
        created: {type: Date, default: function () { return new Date; }},
        updated: {type: Date, default: function () { return new Date; }}
    },
    relations: {
        accessTokens: {
            type: 'hasMany',
            model: 'AccessToken',
            foreignKey: 'userId'
        }
    },
    acls: [
        {
            principalType: sec.ROLE,
            principalId: sec.EVERYONE,
            permission: sec.DENY
        },
        {
            principalType: sec.ROLE,
            principalId: sec.EVERYONE,
            permission: sec.ALLOW,
            property: 'create'
        },
        {
            principalType: sec.ROLE,
            principalId: sec.OWNER,
            permission: sec.ALLOW,
            property: 'deleteById'
        },
        {
            principalType: sec.ROLE,
            principalId: sec.EVERYONE,
            permission: sec.ALLOW,
            property: "login"
        },
        {
            principalType: sec.ROLE,
            principalId: sec.EVERYONE,
            permission: sec.ALLOW,
            property: "logout"
        },
        {
            principalType: sec.ROLE,
            principalId: sec.OWNER,
            permission: sec.ALLOW,
            property: "findById"
        },
        {
            principalType: sec.ROLE,
            principalId: sec.OWNER,
            permission: sec.ALLOW,
            property: "updateById"
        },
        {
            principalType: sec.ROLE,
            principalId: sec.OWNER,
            permission: sec.ALLOW,
            property: "updateAttributes"
        },
        {
            principalType: sec.ROLE,
            principalId: sec.EVERYONE,
            permission: sec.ALLOW,
            property: "confirm"
        }
    ]
};