/*
 * PUSH Notification server
 * (c) Telefonica Digital, 2012 - All rights reserved
 * License: GNU Affero V3 (see LICENSE file)
 * Fernando Rodríguez Sela <frsela@tid.es>
 * Guillermo Lopez Leal <gll@tid.es>
 */

'use strict';

var DataStore = require('./DataStore.js');
var Log = require('./Logger.js');
var helpers = require('./Helpers.js');
var events = require('events');
var util = require('util');

var operator = require('./DB/operator');


function MobileNetwork() {
    events.EventEmitter.call(this);
    this.cache = {};
    this.ready = false;
    this.callbacks = [];
}
util.inherits(MobileNetwork, events.EventEmitter);

MobileNetwork.prototype.callbackReady = function (callback) {
    if (this.ready) {
        callback(true);
        return;
    }
    this.callbacks.push(helpers.checkCallback(callback));
};

MobileNetwork.prototype.init = function (machines, name, options, cb) {
    this.resetCache();
    var self = this;
    this.callbackReady(cb);
    DataStore.once('connected', function () {
        Log.debug('MobileNetwork --> Library read');
        self.ready = true;
        self.emit('connected');
        var callbacks = self.callbacks || [];
        callbacks.forEach(function (elem) {
            elem(true);
        });
    });
    DataStore.once('disconnected', function() {
        Log.debug('MobileNetwork --> Library read');
        self.ready = false;
        self.emit('disconnected');
    });

    process.nextTick(function() {
        DataStore.init(machines, name);
    });
};

MobileNetwork.prototype.close = function (cb) {
    DataStore.close(cb);
};

MobileNetwork.prototype.resetCache = function (callback) {
    this.cache = {};
    Log.debug('MobileNetwork -->  cache cleaned');
    callback = helpers.checkCallback(callback);
    callback();
};

MobileNetwork.prototype.getNetwork = function (mcc, mnc, callback) {
    callback = helpers.checkCallback(callback);

    var index = helpers.padNumber(mcc, 3) + '-' + helpers.padNumber(mnc, 2);
    var value;

    Log.debug('MobileNetwork --> looking for MCC-MNC: ' + index);
    // Check if the network is in the cache
    if (value = this.cache[index]) {
        Log.debug('MobileNetwork --> found on cache:', value);
        callback(null, value, 'cache');
        return;
    }

    var self = this;
    // Check if the network is in the database and update cache
    operator.getByMccMnc(mcc, mnc, function (error, data) {
        if (error) {
            Log.error(Log.messages.ERROR_MOBILENETWORKERROR, {
                error: error
            });
            callback(error);
            return;
        }
        if (!data) {
            Log.debug('MobileNetwork --> Not found on database');
            callback(null, null, 'ddbb');
            return;
        }
        Log.debug('MobileNetwork --> found on database:', data);
        self.cache[index] = data;
        callback(null, data, 'ddbb');
    });
};


///////////////////////////////////////////
// Singleton
///////////////////////////////////////////
var _mn = new MobileNetwork();
function getMobileNetwork() {
    return _mn;
}

module.exports = getMobileNetwork();
