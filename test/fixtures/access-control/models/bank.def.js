"use strict";

module.exports = {
    "crud": true,
    "relations": {
        "users": {
            "model": "user",
            "type": "hasMany"
        },
        "accounts": {
            "model": "account",
            "type": "hasMany"
        }
    },
    "acls": [
        {
            "accessType": "*",
            "permission": "DENY",
            "principalType": "ROLE",
            "principalId": "$everyone"
        },
        {
            "accessType": "READ",
            "permission": "ALLOW",
            "principalType": "ROLE",
            "principalId": "$everyone"
        }
    ],
    "public": true
};