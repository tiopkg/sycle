var path = require('path');

module.exports = function () {
    return require('./definitions')(path.resolve(__dirname, '..', '..', 'common', 'models'));
};