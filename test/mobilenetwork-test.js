/*
 * PUSH Notification server
 * (c) Telefonica Digital, 2012 - All rights reserved
 * License: GNU Affero V3 (see LICENSE file)
 * Fernando Rodríguez Sela <frsela@tid.es>
 * Guillermo Lopez Leal <gll@tid.es>
 */
'use strict';

var vows = require('vows');
var assert = require('assert');

var MobileNetwork = require('../src/common/MobileNetwork/MobileNetwork.js');

/*var Log = require('../Logger');
Log.init('test', 'MN-test', 1);*/

var db = {
    "machines": [
        ["localhost", 27017]
    ],
    "name": "push_notification_server"
};

vows.describe('MobileNetwork tests').addBatch({
    'Wait for readyness': {
        topic: function () {
            MobileNetwork.init(db.machines, db.name, db.options, this.callback);
        },
        'is ready': function (ok) {
            assert.isTrue(ok);
        }
    }
}).addBatch({
    'Searching for 214-07 (came from DDBB).': {
        topic: function () {
            MobileNetwork.getNetwork("214", "07", this.callback);
        },
        'error is null': function (error, data, where) {
            assert.isNull(error);
        },
        'data received is an object': function (error, data, where) {
            assert.isObject(data);
        },
        'data._id is 214-07': function (error, data, where) {
            assert.equal(data._id, "214-07");
        },
        'data.country is Spain': function (error, data, where) {
            assert.equal(data.country, "Spain");
        },
        'data.operator is "Telefónica Móviles España, SAU"': function (error, data, where) {
            assert.equal(data.operator, "Telefónica Móviles España, SAU");
        },
        'data.mcc is 214': function (error, data, where) {
            assert.equal(data.mcc, "214");
        },
        'data.mnc is 07': function (error, data, where) {
            assert.equal(data.mnc, "07");
        },
        'where it comes is ddbb': function (error, data, where) {
            assert.equal(where, "ddbb");
        },
        'Searching (came from cache).': {
            topic: function () {
                MobileNetwork.getNetwork("214", "07", this.callback);
            },
            'error is null': function (error, data, where) {
                assert.isNull(error);
            },
            'data received is an object': function (error, data, where) {
                assert.isObject(data);
            },
            'data._id is 214-07': function (error, data, where) {
                assert.equal(data._id, "214-07");
            },
            'data.country is Spain': function (error, data, where) {
                assert.equal(data.country, "Spain");
            },
            'data.operator is "Telefónica Móviles España, SAU"': function (error, data, where) {
                assert.equal(data.operator, "Telefónica Móviles España, SAU");
            },
            'data.mcc is 214': function (error, data, where) {
                assert.equal(data.mcc, "214");
            },
            'data.mnc is 07': function (error, data, where) {
                assert.equal(data.mnc, "07");
            },
            'where it comes is cache': function (error, data, where) {
                assert.equal(where, "cache");
            },
            'Cache cleared.': {
                topic: function () {
                    MobileNetwork.resetCache(this.callback);
                },
                'Searching again (from DDBB).': {
                    topic: function () {
                        MobileNetwork.getNetwork("214", "07", this.callback);
                    },
                    'error is null': function (error, data, where) {
                        assert.isNull(error);
                    },
                    'data received is an object': function (error, data, where) {
                        assert.isObject(data);
                    },
                    'data._id is 214-07': function (error, data, where) {
                        assert.equal(data._id, "214-07");
                    },
                    'data.country is Spain': function (error, data, where) {
                        assert.equal(data.country, "Spain");
                    },
                    'data.operator is "Telefónica Móviles España, SAU"': function (error, data, where) {
                        assert.equal(data.operator, "Telefónica Móviles España, SAU");
                    },
                    'data.mcc is 214': function (error, data, where) {
                        assert.equal(data.mcc, "214");
                    },
                    'data.mnc is 07': function (error, data, where) {
                        assert.equal(data.mnc, "07");
                    },
                    'where it comes is ddbb': function (error, data, where) {
                        assert.equal(where, "ddbb");
                    }
                }
            }
        }
    }
}).addBatch({
    'Recovering non existing.': {
        topic: function () {
            MobileNetwork.getNetwork("999", "99", this.callback);
        },
        'error is null': function (error, data, where) {
            assert.isNull(error);
        },
        'data is null': function (error, data, where) {
            assert.isNull(error);
        },
        'where it comes is ddbb': function (error, data, where) {
            assert.equal(where, 'ddbb');
        }
    }
}).addBatch({
    'Cache cleared.': {
        topic: function () {
            MobileNetwork.resetCache(this.callback);
        },
        'Recovering 214-07 (testing padding).': {
            topic: function () {
                MobileNetwork.getNetwork(214, 7, this.callback);
            },
            'error is null': function (error, data, where) {
                assert.isNull(error);
            },
            'data received is an object': function (error, data, where) {
                assert.isObject(data);
            },
            'data._id is 214-07': function (error, data, where) {
                assert.equal(data._id, "214-07");
            },
            'data.country is Spain': function (error, data, where) {
                assert.equal(data.country, "Spain");
            },
            'data.operator is "Telefónica Móviles España, SAU"': function (error, data, where) {
                assert.equal(data.operator, "Telefónica Móviles España, SAU");
            },
            'data.mcc is 214': function (error, data, where) {
                assert.equal(data.mcc, "214");
            },
            'data.mnc is 07': function (error, data, where) {
                assert.equal(data.mnc, "07");
            },
            'where it comes is ddbb': function (error, data, where) {
                assert.equal(where, "ddbb");
            }
        }
    }
}).addBatch({
    'Closing MobileNetwork': {
        topic: MobileNetwork.close(),
        'closed': function (yes) {
            assert.equal('yes', 'yes');
        }
    }
}).export(module); // Export the Suite