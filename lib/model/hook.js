"use strict";

module.exports = function (/*registry*/) {

    return {
        define: function (Model/*, name, properties, settings*/) {
            var hooks = require('middist')();

            Model.hook = function (hook, fn) {
                if (!Model[hook]) Model[hook] = function (next, data) {
                    hooks.handle(hook, data, next);
                };
                hooks.use(hook, fn);
            };

            return Model;
        }
    }
};