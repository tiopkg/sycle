"use strict";

var st = require('sycle-test').local;
var s = require('./support');
var setupAccessControl = require('./fixtures/access-control/app');

var USER = {email: 'test@test.test', password: 'test'};
var CURRENT_USER = {email: 'current@test.test', password: 'test'};

describe('access control - integration', function () {

    st.beforeEach.withSapp(setupAccessControl());

    describe('user', function () {

        st.beforeEach.givenModel('user', USER, 'randomUser');

        st.it.shouldBeDeniedWhenCalledAnonymously('user.all');
        st.it.shouldBeDeniedWhenCalledUnauthenticated('user.all');
        st.it.shouldBeDeniedWhenCalledByUser(CURRENT_USER, 'user.all');

        st.it.shouldBeDeniedWhenCalledAnonymously('user.findById', dataForUser);
        st.it.shouldBeDeniedWhenCalledUnauthenticated('user.findById', dataForUser);
        st.it.shouldBeDeniedWhenCalledByUser(CURRENT_USER, 'user.findById', dataForUser);

        st.it.shouldBeAllowedWhenCalledAnonymously('user.create', newUserData());
        st.it.shouldBeAllowedWhenCalledByUser(CURRENT_USER, 'user.create', newUserData());

        st.it.shouldBeAllowedWhenCalledByUser(CURRENT_USER, 'user.logout');

        st.describe.whenCalledLocally('user.deleteById', function() {
            // `deleteById` is allowed for the owner, and the owner acl resolver requires `id` param,.
            // here no param provided, so the request should be denied.
            // Under rest mode, url will be DELETE /user/:id, so the request url should not be found.
            st.it.shouldBeDenied();
            // st.it.shouldNotBeFound();
        });

        st.it.shouldBeDeniedWhenCalledAnonymously('user.updateById', dataForUser);
        st.it.shouldBeDeniedWhenCalledUnauthenticated('user.updateById', dataForUser);
        st.it.shouldBeDeniedWhenCalledByUser(CURRENT_USER, 'user.updateById', dataForUser);

        st.describe.whenLoggedInAsUser(CURRENT_USER, function() {
            beforeEach(function() {
                this.data = { id: this.user.id }
            });
            st.describe.whenCalledLocally('user.deleteById', function() {
                st.it.shouldBeAllowed();
            });
            st.describe.whenCalledLocally('user.updateById', function() {
                st.it.shouldBeAllowed();
            });
        });

        st.it.shouldBeDeniedWhenCalledAnonymously('user.deleteById', dataForUser);
        st.it.shouldBeDeniedWhenCalledUnauthenticated('user.deleteById', dataForUser);
        st.it.shouldBeDeniedWhenCalledByUser(CURRENT_USER, 'user.deleteById', dataForUser);

        function dataForUser() {
            return {id: this.randomUser.id}
        }

        var userCounter;
        function newUserData() {
            userCounter = userCounter ? ++userCounter : 1;
            return {
                email: 'new-' + userCounter + '@test.test',
                password: 'test'
            };
        }
    });


    describe('banks', function () {
        st.beforeEach.givenModel('bank');

        st.it.shouldBeAllowedWhenCalledAnonymously('banks.all');
        st.it.shouldBeAllowedWhenCalledUnauthenticated('banks.all');
        st.it.shouldBeAllowedWhenCalledByUser(CURRENT_USER, 'banks.all');

        st.it.shouldBeAllowedWhenCalledAnonymously('banks.findById', dataForBank);
        st.it.shouldBeAllowedWhenCalledUnauthenticated('banks.findById', dataForBank);
        st.it.shouldBeAllowedWhenCalledByUser(CURRENT_USER, 'banks.findById', dataForBank);

        st.it.shouldBeDeniedWhenCalledAnonymously('banks.create');
        st.it.shouldBeDeniedWhenCalledUnauthenticated('banks.create');
        st.it.shouldBeDeniedWhenCalledByUser(CURRENT_USER, 'banks.create');

        st.it.shouldBeDeniedWhenCalledAnonymously('banks.updateById', dataForBank);
        st.it.shouldBeDeniedWhenCalledUnauthenticated('banks.updateById', dataForBank);
        st.it.shouldBeDeniedWhenCalledByUser(CURRENT_USER, 'banks.updateById', dataForBank);

        st.it.shouldBeDeniedWhenCalledAnonymously('banks.deleteById', dataForBank);
        st.it.shouldBeDeniedWhenCalledUnauthenticated('banks.deleteById', dataForBank);
        st.it.shouldBeDeniedWhenCalledByUser(CURRENT_USER, 'banks.deleteById', dataForBank);

        function dataForBank() {
            return { id: this.bank.id };
        }
    });

    describe('accounts', function () {
        var count = 0;
        before(function() {
            var Role = this.sapp.models.Role;
            Role.registerResolver('$dummy', function (role, context, callback) {
                process.nextTick(function () {
                    if(context.remoteContext) {
                        count++;
                    }
                    callback && callback(null, false); // Always true
                });
            });
        });

        st.beforeEach.givenModel('account');

        st.it.shouldBeDeniedWhenCalledAnonymously('accounts.all');
        st.it.shouldBeDeniedWhenCalledUnauthenticated('accounts.all');
        st.it.shouldBeDeniedWhenCalledByUser(CURRENT_USER, 'accounts.all');

        st.it.shouldBeDeniedWhenCalledAnonymously('accounts.findById', dataForAccount);
        st.it.shouldBeDeniedWhenCalledUnauthenticated('accounts.findById', dataForAccount);
        st.it.shouldBeDeniedWhenCalledByUser(CURRENT_USER, 'accounts.findById', dataForAccount);


        st.it.shouldBeDeniedWhenCalledAnonymously('accounts.create');
        st.it.shouldBeDeniedWhenCalledUnauthenticated('accounts.create');
        st.it.shouldBeDeniedWhenCalledByUser(CURRENT_USER, 'accounts.create');

        st.it.shouldBeDeniedWhenCalledAnonymously('accounts.updateById', dataForAccount);
        st.it.shouldBeDeniedWhenCalledUnauthenticated('accounts.updateById', dataForAccount);
        st.it.shouldBeDeniedWhenCalledByUser(CURRENT_USER, 'accounts.updateById', dataForAccount);

        st.describe.whenLoggedInAsUser(CURRENT_USER, function() {
            beforeEach(function(done) {
                var self = this;

                // Create an account under the given user
                this.sapp.model('account').create({
                    userId: self.user.id,
                    balance: 100
                }, function(err, act) {
                    self.data = {id: act.id};
                    done();
                });

            });
            st.describe.whenCalledLocally('accounts.updateById', function() {
                st.it.shouldBeAllowed();
            });
            st.describe.whenCalledLocally('accounts.findById', function() {
                st.it.shouldBeAllowed();
            });
            st.describe.whenCalledLocally('accounts.deleteById', function() {
                st.it.shouldBeDenied();
            });
        });

        st.it.shouldBeDeniedWhenCalledAnonymously('accounts.deleteById', dataForAccount);
        st.it.shouldBeDeniedWhenCalledUnauthenticated('accounts.deleteById', dataForAccount);
        st.it.shouldBeDeniedWhenCalledByUser(CURRENT_USER, 'accounts.deleteById', dataForAccount);

        function dataForAccount() {
            return {id: this.account.id};
        }
    });
});
