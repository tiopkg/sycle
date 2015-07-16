var sycle = require('../');
var s = require('./support');
var t = s.t;

describe('hidden properties', function () {

    var sapp, Product, Category;

    beforeEach(function (done) {
        sapp = sycle();
        sapp.registry.define('Product', {
            crud: true,
            hidden: ['secret'],
            properties: {
                name: String,
                secret: String
            }
        });
        sapp.registry.define('Category', {
            crud: true,
            properties: {
                name: String
            },
            relations: {
                products: {
                    type: "hasMany",
                    model: "Product"
                }
            }
        });
        sapp.phase(sycle.boot.database());
        sapp.boot(function (err) {
            if (err) return done(err);
            Category = sapp.model('Category');
            Product = sapp.model('Product');

            Category.create({
                name: 'my category'
            }, function (err, category) {
                category.products.create({
                    name: 'pencil',
                    secret: 'a secret'
                }, done);
            });
        });
    });

    afterEach(function (done) {
        Category.destroyAll(function () {
            Product.destroyAll(done);
        });
    });

    it('should hide a property remotely', function (done) {
        sapp.request('product.all').send(function (err, result) {
            if (err) return done(err);
            var product = result[0].toJSON();
            t.equal(product.name, 'pencil');
            t.equal(product.secret, undefined);
            done();
        });
    });

    it('should hide a property of nested models', function (done) {
        sapp.request('category.all', {filter: {include: 'products'}}).send(function (err, result) {
            if (err) return done(err);
            var category = result[0].toJSON();
            var product = category.products[0];
            t.equal(product.name, 'pencil');
            t.equal(product.secret, undefined);
            done();
        });
    });
});
