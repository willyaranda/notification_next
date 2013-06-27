/*
 * PUSH Notification server
 * (c) Telefonica Digital, 2012 - All rights reserved
 * License: GNU Affero V3 (see LICENSE file)
 * Fernando Rodríguez Sela <frsela@tid.es>
 * Guillermo Lopez Leal <gll@tid.es>
 */

'use strict';

var client = require('mongodb').MongoClient;
var log = require('./Logger.js');
var events = require('events');
var util = require('util');
var helpers = require('../common/helpers.js');
var connectionstate = require('../common/constants.js').connectionstate;

function DataStore() {
    events.EventEmitter.call(this);
    this.callbacks = [];
}
util.inherits(DataStore, events.EventEmitter);

DataStore.prototype.callbackReady = function (callback) {
    if (this.ready) {
        callback(true);
        return;
    }
    this.callbacks.push(helpers.checkCallback(callback));
};

DataStore.prototype.init = function (machines, dbname) {
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

    var options = {
        db: {},
        server: {
            socketOptions: {
                keepAlive: 1
            }
        },
        replSet: {
            socketOptions: {
                keepAlive: 1
            }
        },
        mongos: {
            socketOptions: {
                keepAlive: 1
            }
        }
    };

    var self = this;
    client.connect(mongourl, options, function (err, db) {
        if (err) {
            log.critical(log.messages.CRITICAL_DBCONNECTIONERROR, {
                class: 'datastore',
                method: 'starting',
                error: err
            });
            self.close();
            return;
        }
        self.db = db;
        log.info('datastore::init --> Connected to MongoDB on ' +
            machines + '. Database Name: ' + dbname);
        self.emit('connected');
        self.ready = true;
        var callbacks = self.callbacks || [];
        callbacks.forEach(function (elem) {
            elem(true);
        });
    });
};

DataStore.prototype.close = function () {
    log.info('datastore::close --> Closing connection to DB');
    this.db.close();
    this.emit('disconnected');
    this.ready = false;
};

DataStore.prototype.registerNode = function (uaid, serverId, data, callback) {
    this.db.collection('nodes', function (err, collection) {
        callback = helpers.checkCallback(callback);
        if (err) {
            log.error(log.messages.ERROR_DSERROROPENINGNODESCOLLECTION, {
                'method': 'registerNode',
                'error': err
            });
            callback(err);
            return;
        }
        collection.findAndModify(
            { _id: uaid },
            [],
            {
                $set: {
                    si: serverId,
                    dt: data,
                    co: connectionstate.CONNECTED,
                    lt: new Date()
                }
            },
            { safe: true, upsert: true },
            function (err, res) {
                if (err) {
                    log.error(log.messages.ERROR_DSERRORINSERTINGNODEINDB, {
                        error: err
                    });
                    callback(err);
                    return;
                }
                log.debug('dataStore::registerNode --> Node inserted/updated ' +
                    uaid);
                callback(null, res, data);
            }
        );
    });
};

/**
 * Unregister a node
 */
DataStore.prototype.unregisterNode = function (uaid, fullyDisconnected, callback) {
    this.db.collection('nodes', function (err, collection) {
        callback = helpers.checkCallback(callback);
        if (err) {
            log.error(log.messages.ERROR_DSERROROPENINGNODESCOLLECTION, {
                method: 'unregisterNode',
                error: err
            });
            callback(err);
            return;
        }
        collection.findAndModify(
            { _id: uaid },
            [],
            {
                $set: {
                    co: fullyDisconnected,
                    lt: new Date()
                }
            },
            { safe: true },
            function (err, data) {
                if (err) {
                    log.error(log.messages.ERROR_DSERRORREMOVINGNODE, {
                        error: err
                    });
                    return callback(err);
                }
                log.debug('datastore::unregisterNode --> Node removed from MongoDB');
                return callback(null, data);
            }
        );
    });
};

/**
 * Gets a node - server relationship
 */
DataStore.prototype.getNodeData = function (uaid, callback) {
    log.debug('datastore::getNodeData --> Finding info for node ' + uaid);
    // Get from MongoDB
    this.db.collection('nodes', function (err, collection) {
        callback = helpers.checkCallback(callback);
        if (err) {
            log.error(log.messages.ERROR_DSERROROPENINGNODESCOLLECTION, {
                method: 'getNodeData',
                error: err
            });
            callback(err);
            return;
        }
        collection.findOne({ _id: uaid }, function (err, data) {
            if (err) {
                log.error(log.messages.ERROR_DSERRORFINDINGNODE, {
                    error: err
                });
                callback(err);
                return;
            }
            var msg = data ? 'Data found, calling callback with data' :
                             'Node not found';
            log.debug('datastore::getNodeData --> ' + msg);
            callback(null, data);
        });
    });
};

/**
 * Register a new application
 */
DataStore.prototype.registerApplication = function (appToken, channelID, uaid,
                                                    cert, callback) {
    // Store in MongoDB
    this.db.collection('apps', function (err, collection) {
        if (err) {
            log.error(log.messages.ERROR_DSERROROPENINGAPPSCOLLECTION, {
                method: 'registerApplication',
                error: err
            });
            return;
        }
        collection.findAndModify(
            { _id: appToken },
            [],
            {
                $set: {
                    ce: cert,
                    ch: channelID
                },
                $addToSet: {
                    no: uaid
                }
            },
            { safe: true, upsert: true },
            function (err) {
                if (err) {
                    log.error(log.messages.ERROR_DSERRORINSERTINGAPPINDB, {
                        error: err
                    });
                    return;
                }
                log.debug('datastore::registerApplication --> Application' +
                    ' inserted into MongoDB');
            }
        );
    });
    this.db.collection('nodes', function (err, collection) {
        callback = helpers.checkCallback(callback);
        if (err) {
            log.error(log.messages.ERROR_DSERROROPENINGNODESCOLLECTION, {
                method: 'registerApplication',
                error: err
            });
            callback(err);
            return;
        }
        collection.findAndModify(
            { _id: uaid },
            [],
            {
                $addToSet: {
                    ch: {
                        ch: channelID,
                        app: appToken
                    }
                }
            },
            { safe: true, upsert: true },
            function (err, data) {
                if (err) {
                    log.error(log.messages.ERROR_DSERRORINSERTINGMSGTONODE, {
                        method: 'registerApplication',
                        error: err
                    });
                    callback(err);
                    return;
                }
                log.debug('dataStore::registerApplication --> Message inserted');
                callback(null, data);
            }
        );
    });
};

/**
 * Unregister an old application
 */
DataStore.prototype.unregisterApplication = function (appToken, uaid, callback) {
    // Remove from MongoDB
    callback = helpers.checkCallback(callback);
    this.db.collection('apps', function (err, collection) {
        if (err) {
            log.error(log.messages.ERROR_DSERROROPENINGAPPSCOLLECTION, {
                method: 'unregisterApplication',
                error: err
            });
            return;
        }
        collection.findAndModify(
            { _id: appToken },
            [],
            { $pull: {
                no: uaid
            }
            },
            { safe: true },
            function (err, data) {
                if (err) {
                    log.error(log.messages.ERROR_DSUNDETERMINEDERROR, {
                        error: err
                    });
                    callback(err);
                    return;
                }
                if (!data) {
                    log.debug('dataStore::unregisterApplication --> appToken' +
                        ' not found');
                    callback(-1);
                    return;
                }
                log.debug('dataStore::unregisterApplication --> Deleted node' +
                    ' from apps collection');
            }
        );
    });

    this.db.collection('nodes', function (err, collection) {
        if (err) {
            log.error(log.messages.ERROR_DSERROROPENINGNODESCOLLECTION, {
                method: 'unregisterApplication',
                error: err
            });
            return;
        }
        collection.findAndModify(
            {
                _id: uaid,
                'ch.app': appToken
            },
            [],
            {
                $pull: {
                    ch: {
                        app: appToken
                    }
                }
            },
            function (err) {
                if (err) {
                    log.debug('datastore::unregisterApplication --> Error' +
                        ' removing apptoken from the nodes: ' + err);
                    return callback(err);
                }
                log.debug('datastore::unregisterApplication --> Application' +
                    ' removed from node data');
                return callback(null);
            }
        );
    });

    //Remove the appToken if the nodelist (no) is empty
    this.removeApplicationIfEmpty(appToken);
};

DataStore.prototype.removeApplicationIfEmpty = function (appToken) {
    this.db.collection('apps', function (err, collection) {
        if (err) {
            log.error(log.messages.ERROR_DSERROROPENINGAPPSCOLLECTION, {
                method: 'removeApplicationIfEmpty',
                error: err
            });
            return;
        }
        collection.findAndModify(
            {
                _id: appToken,
                no: { $size: 0 }
            },
            [], //Sort
            {}, //Replacement
            {
                safe: false,
                remove: true //Remove document
            },
            function (err) {
                if (err) {
                    log.debug('datastore::removeApplicationIfEmpty --> Error' +
                        ' removing application from apps: ' + err);
                }
            }
        );
    });
};

/**
 * Recover a list of WA associated to a UA
 */
DataStore.prototype.getApplicationsForUA = function (uaid, callback) {
    // Get from MongoDB
    log.debug('datastore::getApplicationsOnUA --> Going to find applications' +
        ' in UA: ' + uaid);
    this.db.collection('nodes', function (err, collection) {
        callback = helpers.checkCallback(callback);
        if (err) {
            log.error(log.messages.ERROR_DSERROROPENINGAPPSCOLLECTION, {
                method: 'getApplicationsForUA',
                error: err
            });
            callback(err);
        }
        collection.findOne(
            { _id: uaid },
            { _id: false, ch: true },
            function (err, data) {
                if (err) {
                    log.error(log.messages.ERROR_DSERRORFINDINGAPPS, {
                        error: err
                    });
                    callback(err);
                    return;
                }
                if (data && data.ch && data.ch.length) {
                    log.debug('datastore::getApplicationsOnUA --> Applications' +
                        ' recovered, calling callback');
                    callback(null, data.ch);
                } else {
                    log.debug('datastore::getApplicationsOnUA --> No' +
                        ' applications recovered');
                    callback(null, []);
                }
            }
        );
    });
};

/**
 * Gets an application node list
 */
DataStore.prototype.getApplication = function (appToken, callback, json) {
    // Get from MongoDB
    log.debug('datastore::getApplication --> Going to find application with' +
        'appToken: ' + appToken);
    this.db.collection('nodes', function (err, collection) {
        callback = helpers.checkCallback(callback);
        if (err) {
            log.error(log.messages.ERROR_DSERROROPENINGAPPSCOLLECTION, {
                method: 'getApplication',
                error: err
            });
            callback(err);
            return;
        }
        collection.find(
            {
                'ch.app': appToken
            },
            {
                _id: true,
                co: true,
                si: true,
                dt: true
            }
        ).toArray(function (err, data) {
                if (err) {
                    log.error(log.messages.ERROR_DSERRORFINDINGAPP, {
                        error: err
                    });
                    callback(err);
                    return;
                }
                log.debug('datastore::getApplication --> Application found');
                var msg = data ? 'Application found, have callback, calling' :
                                 'No app found, calling callback';
                log.debug('datastore::getApplication --> ' + msg, data);
                callback(null, data, json);
            });
    });
};

DataStore.prototype.getChannelIDForAppToken = function (apptoken, callback) {
    apptoken = apptoken.toString();
    log.debug('datastore::getChannelIDForAppToken --> Going to find the' +
        ' channelID for the appToken ' + apptoken);
    this.db.collection('apps', function (err, collection) {
        callback = helpers.checkCallback(callback);
        if (err) {
            log.error(log.messages.ERROR_DSERROROPENINGAPPSCOLLECTION, {
                method: 'getChannelIDForAppToken',
                error: err
            });
            callback(err);
            return;
        }
        collection.findOne({ _id: apptoken }, function (err, data) {
            if (err) {
                log.error(log.messages.ERROR_DSERRORFINDINGCERTIFICATE, {
                    method: 'getChannelIDForAppToken',
                    error: err
                });
                callback(err);
                return;
            }
            if (!data) {
                log.debug('datastore::getChannelIDForAppToken --> There are no' +
                    ' appToken=' + apptoken + ' in the DDBB');
                callback(null, null);
                return;
            }
            callback(null, data.ch);
        });
    });
};

/**
 * Save a new message
 * @return New message as stored on DB.
 */
DataStore.prototype.newVersion = function (appToken, channelID, version) {
    var msg = {};
    msg.app = appToken;
    msg.ch = channelID;
    msg.vs = version;

    this.db.collection('nodes', function (err, collection) {
        if (err) {
            log.error(log.messages.ERROR_DSERROROPENINGNODESCOLLECTION, {
                method: 'newVersion',
                error: err
            });
            return;
        }
        collection.findAndModify(
            { 'ch.app': appToken },
            [],
            { $set: {
                'ch.$.vs': version,
                'ch.$.new': 1
            }
            },
            { upsert: true },
            function (error) {
                if (error) {
                    log.error(log.messages.ERROR_DSERRORSETTINGNEWVERSION, {
                        apptoken: appToken
                    });
                    return;
                }
                log.debug('dataStore::newVersion --> Version updated');
            }
        );
    });
    return msg;
};

/**
 * This ACKs a message by putting a "new" flag to 0 on the node,
 * on the channelID ACKed
 *
 */
DataStore.prototype.ackMessage = function (uaid, channelID, version) {
    log.debug('dataStore::ackMessage --> Going to ACK message from uaid=' +
        uaid + ' for channelID=' + channelID + ' and version=' + version);
    this.db.collection('nodes', function (error, collection) {
        if (error) {
            log.error(log.messages.ERROR_DSERROROPENINGNODESCOLLECTION, {
                method: 'ackMessage',
                error: error
            });
            return;
        }
        collection.findAndModify(
            {
                _id: uaid,
                'ch.ch': channelID
            },
            [],
            {
                $set: {
                    'ch.$.new': 0
                }
            },
            { upsert: true },
            function (err) {
                if (err) {
                    log.error(log.messages.ERROR_DSERRORACKMSGINDB, {
                        error: err
                    });
                }
            }
        );
    });
};

/**
 * Recovers an operator from the dataStore
 */
DataStore.prototype.getOperator = function (mcc, mnc, callback) {
    var id = helpers.padNumber(mcc, 3) + '-' + helpers.padNumber(mnc, 2);
    log.debug('Looking for operator ' + id);
    // Get from MongoDB
    this.db.collection('operators', function (err, collection) {
        callback = helpers.checkCallback(callback);
        if (err) {
            log.error(log.messages.ERROR_DSERROROPENINGOPERATORSCOLLECTION, {
                method: 'getOperator',
                error: err
            });
            callback(err);
            return;
        }
        collection.findOne({ '_id': id }, function (err, data) {
            if (err) {
                log.debug('datastore::getOperator --> Error finding operator' +
                    ' from MongoDB: ' + err);
                callback(err);
                return;
            }
            var msg = data ? 'The operator has been recovered. ' :
                             'No operator found. ';
            log.debug('datastore::getOperator --> ' + msg + ' Calling callback');
            callback(null, data);
        });
    });
};

DataStore.prototype.getUDPClientsAndUnACKedMessages = function (callback) {
    callback = helpers.checkCallback(callback);
    this.db.collection('nodes', function (err, collection) {
        if (err) {
            log.error(log.messages.ERROR_DSERROROPENINGNODESCOLLECTION, {
                method: 'getUDPClientsAndUnACKedMessages',
                error: err
            });
            callback(err);
            return;
        }
        collection.find(
            {
                'dt.protocol': 'udp',
                ch: {
                    $elemMatch: {
                        new: 1
                    }
                }
            },
            {
                si: true,
                'dt.wakeup_hostport': true,
                'dt.mobilenetwork': true
            }
        ).toArray(function (err, nodes) {
                if (err) {
                    log.error(log.messages.ERROR_DSERROROPENINGNODESCOLLECTION, {
                        method: 'getUDPClientsAndUnACKedMessages',
                        error: err
                    });
                    callback(err);
                    return;
                }
                if (!nodes.length) {
                    callback(null, null);
                }
                log.debug('dataStore::getUDPClientsAndUnACKedMessages -->' +
                    ' Data found.');
                callback(null, nodes);
            });
    });
};

DataStore.prototype.flushDb = function () {
    this.db.collection('apps', function (err, collection) {
        if (err) {
            log.error(log.messages.ERROR_DSERROROPENINGAPPSCOLLECTION, {
                method: 'flushDb',
                error: err
            });
            return;
        }
        collection.remove({}, function (err) {
            if (err) {
                log.error(log.messages.ERROR_DSERRORREMOVINGXXXCOLLECTION, {
                    collection: 'apps',
                    error: err
                });
            }
        });
    });
    this.db.collection('nodes', function (err, collection) {
        if (err) {
            log.error(log.messages.ERROR_DSERROROPENINGNODESCOLLECTION, {
                method: 'flushDb',
                error: err
            });
            return;
        }
        collection.remove({}, function (err) {
            if (err) {
                log.error(log.messages.ERROR_DSERRORREMOVINGXXXCOLLECTION, {
                    collection: 'nodes',
                    error: err
                });
            }
        });
    });
    this.db.collection('operators', function (err, collection) {
        if (err) {
            log.error(log.messages.ERROR_DSERROROPENINGOPERATORSCOLLECTION, {
                method: 'flushDb',
                error: err
            });
            return;
        }
        collection.remove({}, function (err) {
            if (err) {
                log.error(log.messages.ERROR_DSERRORREMOVINGXXXCOLLECTION, {
                    collection: 'operators',
                    error: err
                });

            }
        });
    });
};

var _ds = new DataStore();
function getDataStore() {
    return _ds;
}

module.exports = getDataStore();
