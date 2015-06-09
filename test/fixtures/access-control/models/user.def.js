"use strict";

module.exports = {
    "crud": true,
    "relations": {
        "accessTokens": {
            "model": "accessToken",
            "type": "hasMany",
            "foreignKey": "userId"
        },
        "transactions": {
            "model": "transaction",
            "type": "hasMany"
        }
    },
    "acls": [
        {
            "accessType": "*",
            "permission": "DENY",
            "principalType": "ROLE",
            "principalId": "$everyone"
        }
    ],
    "public": true
};