"use strict";

module.exports = {
    "acls": [
        {
            "accessType": "*",
            "permission": "DENY",
            "principalType": "ROLE",
            "principalId": "$everyone"
        },
        {
            "permission": "ALLOW",
            "principalType": "ROLE",
            "principalId": "$everyone",
            "property": "create"
        }
    ],
    "public": true
};