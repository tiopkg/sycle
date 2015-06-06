module.exports = {
    "name": "Dealership",
    "crud": true,
    "properties": {
        "name": String,
        "zip": Number,
        "address": String
    },
    "relations": {
        "cars": {
            "type": "hasMany",
            "model": "Car",
            "foreignKey": "dealerId"
        }
    }
};