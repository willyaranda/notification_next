'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var nodeSchema = new Schema({
    _id: String,
    ch: [
        {
            ch: String,
            app: String,
            vs: Number,
            new: Boolean
        }
    ],
    co: Number,
    dt: {
        wakeup_hostport: {
            ip: String,
            port: Number
        },
        mobilenetwork: {
            mcc: String,
            mnc: String
        },
        protocol: String,
        canBeWakeup: Boolean
    },
    lt: { type: Date, default: Date.now },
    si: String
});
mongoose.model('node', nodeSchema);

///////
var node = mongoose.model('node');
var helpers = require('../Helpers/Helpers.js');
var connectionstate = require('../constants.js').connectionstate;

exports.register = function (uaid, serverID, data, callback) {
    callback = helpers.checkCallback(callback);
    var nodeObj = {
        co: connectionstate.CONNECTED,
        dt: data,
        lt: new Date(),
        si: serverID
    };
    node.findByIdAndUpdate(uaid, nodeObj, { upsert: true }, function (error, node) {
        if (error) {
            callback(error);
            return;
        }
        callback(null, null, node);
    });
};

exports.unregister = function (uaid, disconnectedStatus, queue, callback) {
    callback = helpers.checkCallback(callback);
    node.findByIdAndUpdate(uaid, {
        co: disconnectedStatus,
        lt: new Date(),
        si: queue
    }, function (error, node) {
        if (error) {
            callback(error);
            return;
        }
        callback(null, node);
    });
};

exports.getData = function (uaid, callback) {
    callback = helpers.checkCallback(callback);
    node.findById(uaid, function (error, node) {
        if (error) {
            callback(error);
            return;
        }
        callback(null, node);
    });
};

exports.registerApplication = function (uaid, channelID, appToken, callback) {
    callback = helpers.checkCallback(callback);

    //Create the object to register
    var ch = {
        _id: channelID, //Cheat
        ch: channelID,
        app: appToken
    };

    node.findByIdAndUpdate(uaid, {
        $addToSet: {
            ch: ch
        }
    }, { upsert: true }, function (error, node) {
        if (error) {
            callback(error);
            return;
        }
        callback(null, node);
    });
};

exports.unregisterApplication = function (uaid, appToken, callback) {
    callback = helpers.checkCallback(callback);
    node.findByIdAndUpdate(uaid, {
        $pull: {
            ch: {
                app: appToken
            }
        }
    }, function (error, node) {
        if (error) {
            callback(error);
            return;
        }
        callback(null, node);
    });
};

exports.newVersion = function (appToken, channelID, version, callback) {
    callback = helpers.checkCallback(callback);

    var msg = {};
    msg.app = appToken;
    msg.ch = channelID;
    msg.vs = version;

    node.findOneAndUpdate({ "ch.app": appToken }, { $set: {
        "ch.$.vs": version,
        "ch.$.new": true
    }
    }, { upsert: true }, function (error, node) {
        if (error) {
            callback(error);
            return;
        }
        callback(null, node);
    });
    return msg;
};

exports.ackMessage = function (uaid, channelID, version, callback) {
    callback = helpers.checkCallback(callback);
    node.findOneAndUpdate({
        _id: uaid,
        "ch.ch": channelID
    }, { $set: {
        "ch.$.new": false
    }
    }, function (error, node) {
        if (error) {
            callback(error);
            return;
        }
        callback(null, node);
    });
};

exports.getUDPClientsAndUnACKedMessages = function (callback) {
    callback = helpers.checkCallback(callback);
    node.find({
        "dt.protocol": "udp",
        ch: {
            $elemMatch: {
                new: true
            }
        }
    }, {
        _id: true,
        si: true,
        dt: true
    }, function (err, nodes) {
        if (err) {
            callback(err);
            return;
        }
        callback(null, nodes);
    });
};