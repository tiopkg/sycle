"use strict";

var s = require('./support');
var t = s.t;
var async = require('async');

var Registry = require('../lib/registry');

var reg, db, models, Book, Chapter, Author, Reader;

describe('registry/relations', function () {
    
    before(function (done) {
        reg = new Registry();
        reg.define('Book', {
            fields: {name: String},
            relations: {
                chapters: {
                    type: 'hasMany'
                },
                users: {
                    type: 'hasMany',
                    model: 'Reader'
                },
                authors: {
                    type: 'hasMany',
                    model: 'Author',
                    foreignKey: 'projectId'
                }
            }
        });
        reg.define('Chapter', {
            fields: {name: {type: String, index: true, limit: 20}}
        });
        reg.define('Author', {
            fields: {name: String},
            relations: {
                readers: {
                    type: 'hasMany'
                }
            }
        });
        reg.define('Reader', {
            fields: {name: String}
        });

        db = reg.build()[0];
        models = reg.models;
        Book = models['Book'];
        Chapter = models['Chapter'];
        Author = models['Author'];
        Reader = models['Reader'];

        db.automigrate(function() {
            async.eachSeries(Object.keys(models), function (name, callback) {
                models[name].destroyAll(callback);
            }, done);
        });
    });

    after(function () {
        db.disconnect();
    });

    it('should register relations to model', function() {
        t.ok(Book.relations['chapters']);
    });

    describe('hasMany', function() {
        it('can be declared in different ways', function(done) {
            var b = new Book;
            t.instanceOf(b.chapters, Function);
            t.instanceOf(b.users, Function);
            t.instanceOf(b.authors, Function);
            t.include(Object.keys((new Chapter).toObject()), 'bookId');
            t.include(Object.keys((new Author).toObject()), 'projectId');

            db.automigrate(done);
        });


        it('can be declared in short form', function(done) {
            t.instanceOf((new Author).readers, Function);
            t.include(Object.keys((new Reader).toObject()), 'authorId');

            db.autoupdate(done);
        });

        it('should build record on scope', function(done) {
            Book.create(function(err, book) {
                var c = book.chapters.build();
                t.equal(c.bookId, book.id);
                c.save(done);
            });
        });

        it('should create record on scope', function(done) {
            Book.create(function(err, book) {
                book.chapters.create(function(err, c) {
                    t.notOk(err);
                    t.ok(c);
                    t.equal(c.bookId, book.id);
                    done();
                });
            });
        });
    });

});