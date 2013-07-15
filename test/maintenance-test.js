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

var Maintenance = require('../src/common/Maintenance/Maintenance.js');


var sendSIGUSR1 = function () {
    //FIXME: SIGUSR1 is caught by V8 and node and starts the debugger
    // instead of what we want (maintenance).
    //process.kill(process.pid, 'SIGUSR1');
}

var sendSIGUSR2 = function () {
    //process.kill(process.pid, 'SIGUSR2');
}

vows.describe('Helpers tests').addBatch({
    'Initial status': {
        topic: Maintenance.isActive(),
        'is inactive': function (status) {
            assert.isFalse(status);
        }
    }
}).addBatch({
    'Changing to active vía active()': {
        topic: function () {
            Maintenance.active();
            return Maintenance.isActive();
        },
        'is active': function (status) {
            assert.isTrue(status);
        }
    }
}).addBatch({
    'Changing to inactive vía inactive()': {
        topic: function () {
            Maintenance.inactive();
            return Maintenance.isActive();
        },
        'is inactive': function (status) {
            assert.isFalse(status);
        }
    }
}).addBatch({
    'Changing to active vía SIGUSR1': {
        topic: function () {
            sendSIGUSR1();
            return Maintenance.isActive()
        },
        'is active': function (status) {
            assert.isTrue(status);
        }
    }
}).addBatch({
    'Changing to inactive vía SIGUSR2': {
        topic: function () {
            sendSIGUSR2();
            return Maintenance.isActive()
        },
        'is inactive': function (status) {
            assert.isFalse(status);
        }
    }
}).export(module); // Export the Suite