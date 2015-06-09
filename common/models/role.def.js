"use strict";

module.exports = function () {
    return {
        properties: {
            id: {type: Number}, // Id
            name: {type: String, index: true, required: true}, // The name of a role
            description: String, // Description

            // Timestamps
            created: {type: Date, default: function () { return new Date;}},
            updated: {type: Date, default: function () { return new Date;}}
        },
        relations: {
            principals: {
                type: 'hasMany',
                model: 'RoleMapping',
                foreignKey: 'roleId'
            }
        }
    }
};