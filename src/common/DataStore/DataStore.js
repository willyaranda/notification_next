/*
 * PUSH Notification server
 * (c) Telefonica Digital, 2012 - All rights reserved
 * License: GNU Affero V3 (see LICENSE file)
 * Fernando Rodríguez Sela <frsela@tid.es>
 * Guillermo Lopez Leal <gll@tid.es>
 */

'use strict';

var client = require('mongodb').MongoClient;
var log = require('./../Logger/Logger.js');
var events = require('events');
var util = require('util');
var helpers = require('./../Helpers/Helpers.js');
var mongoose = require('mongoose');

function DataStore() {
    events.EventEmitter.call(this);
    this.callbacks = [];
    this.ready = false;
}
util.inherits(DataStore, events.EventEmitter);

DataStore.prototype.callbackReady = function (callback) {
    if (this.ready) {
        callback(true);
        return;
    }
    this.callbacks.push(helpers.checkCallback(callback));
};

DataStore.prototype.init = function (machines, dbname, options) {
    if (!Array.isArray(machines) || !dbname) {
        log.error('DataStore::init --> Not enough machines or db data');
        return;
    }
    log.debug('datastore::init --> MongoDB data store loading.');

    var mongourl = (function () {
        var url = 'mongodb://';
        url += machines.map(function (machine) {
            return machine[0] + ':' + machine[1];
        }).toString();
        url += '/' + dbname;
        log.debug('datastore::init --> Going to connect to -- ' + url);
        return url;
    })();

    mongoose.connect(mongourl, options);
    var self = this;
    mongoose.connection.once('open', function() {
        log.info('dataStore::init --> MongoDB connected.');
        var callbacks = self.callbacks || [];
        callbacks.forEach(function(elem) {
            elem(true);
        });
        self.emit('connected');
        self.ready = true;
    });
    mongoose.connection.once('close', function() {
        self.emit('disconnected');
        self.ready = false;
    });
};

DataStore.prototype.close = function (cb) {
    mongoose.disconnect(function onclosed() {
        (helpers.checkCallback(cb))();
    });
};

var _ds = new DataStore();
function getDataStore() {
    return _ds;
}

module.exports = getDataStore();
