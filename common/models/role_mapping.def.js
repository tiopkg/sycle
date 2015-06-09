"use strict";

module.exports = function () {
    return {
        properties: {
            id: {type: String}, // Id
            principalType: {type: String, index: true}, // The principal type, such as user, application, or role
            principalId: {type: String, index: true} // The principal id
        },
        relations: {
            role: {
                type: 'belongsTo',
                model: 'Role',
                foreignKey: 'roleId'
            }
        }
    }
};