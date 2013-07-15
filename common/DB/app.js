'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var appSchema = new Schema({
    _id: String,
    ch: String,
    no: [String]
});
mongoose.model('app', appSchema);

var app = mongoose.model('app');
var helpers = require('../Helpers.js');
var log = require('../Logger');

exports.registerApplication = function (appToken, channelID, uaid, callback) {
    callback = helpers.checkCallback(callback);
    app.findByIdAndUpdate(appToken, {
        $set: {
            ch: channelID
        }, $addToSet: {
            no: uaid
        }
    }, {
        upsert: true
    }, function (error, app) {
        if (error) {
            callback(error);
            return;
        }
        callback(null, app);
    });
};

exports.unregisterApplication = function (uaid, appToken, callback) {
    app.findByIdAndUpdate(appToken, {
        $pull: {
            no: uaid
        }
    }, function (err, app) {
        if (err) {
            callback(err);
            return;
        }
        callback(null, app);
    });
};

exports.getChannelIDForAppToken = function (appToken, callback) {
    log.debug('appAPI::getChannelIDForAppToken --> Looking for ' + appToken);
    app.findById(appToken, function (error, app) {
        if (error) {
            log.error('appAPI::getChannelIDForAppToken --> Error ', error);
            callback(error);
            return;
        }
        if (!app || !app.ch) {
            log.debug('appAPI::getChannelIDForAppToken --> Empty appToken=', appToken);
            callback(null, null);
            return;
        }
        log.debug('appAPI::getChannelIDForAppToken --> Found channelID=' + app.ch + 'for appToken=' + appToken);
        callback(null, app.ch);
    });
};

exports.getNodesByAppToken = function (appToken, callback, json) {
    callback = helpers.checkCallback(callback);
    node.findById(appToken, '_id co si dt', //fields to retrieve
        function (error, nodes) {
            if (error) {
                callback(error);
                return;
            }
            callback(null, nodes, json);
        });
};