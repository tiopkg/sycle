module.exports = {
    "curd": true,
    "properties": {
        "make": {
            "type": "String",
            "required": true
        },
        "model": {
            "type": "String",
            "required": true
        },
        "desc": "Text"
    },
    "relations": {
        "dealer": {
            "type": "belongsTo",
            "model": "Dealership",
            "foreignKey": "dealerId"
        }
    }
};