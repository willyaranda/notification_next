/*
 * PUSH Notification server
 * (c) Telefonica Digital, 2012 - All rights reserved
 * License: GNU Affero V3 (see LICENSE file)
 * Fernando Rodríguez Sela <frsela@tid.es>
 * Guillermo Lopez Leal <gll@tid.es>
 */

'use strict';

var log = require('../common/Logger/Logger.js');
var msgBroker = require('../common/MsgBroker/MsgBroker.js');
var dataStore = require('../common/DataStore/DataStore.js');
var config = require('./config.json');
var events = require('events');
var util = require('util');
var connectionstate = require('../common/Constants.js').connectionstate;

function Monitor() {
    this.dataStoreReady = false;
    this.msgBrokerReady = false;
    this.controlledClose = false;
    log.init(config.logfile, 'Monitor', 1);
    events.EventEmitter.call(this);
}
util.inherits(Monitor, events.EventEmitter);

Monitor.prototype.init = function () {
    var self = this;

    //MsgBroker events and initializations
    msgBroker.once('connected', function () {
        log.info('Monitor::init --> Message Broker connected and ready');
        self.msgBrokerReady = true;
        self.checkIfReady();
    });
    msgBroker.once('disconnected', function () {
        self.ready = false;
        if (self.controlledClose) {
            return;
        }
        log.critical(log.messages.CRITICAL_MBDISCONNECTED, {
            class: 'Monitor',
            method: 'init'
        });
    });

    //DataStore events
    dataStore.once('connected', function () {
        log.info('Monitor::init --> DataStore connected and ready');
        self.dataStoreReady = true;
        self.checkIfReady();
    });
    dataStore.once('disconnected', function () {
        self.dataStoreReady = false;
        if (self.controlledClose) {
            return;
        }
        log.critical(log.messages.CRITICAL_DBDISCONNECTED, {
            class: 'Monitor',
            method: 'init'
        });
    });

    // Connect to the message broker
    process.nextTick(function () {
        msgBroker.init(config.queues);
        dataStore.init(config.db.machines, config.db.name, config.db.options);
    });

    // Check if everything is correct
    this.readyTimeout = setTimeout(function () {
        log.critical(log.messages.CRITICAL_NOTREADY);
    }, 30 * 100); //Wait 30 seconds
};

Monitor.prototype.stop = function (controlled) {
    //If we are closing, do not do anything
    if (this.controlledClose) {
        log.debug('Duplicate kill signal');
        return;
    }
    this.emit('closing');
    this.controlledClose = controlled;

    //Clear all intervals or timeout that we may still have.
    clearInterval(this.retryUDPnotACKedInterval);
    clearTimeout(this.readyTimeout);

    //Close connections to Message Broker and DataStore
    msgBroker.close();
    dataStore.close();

    //Woops, a strange kill
    if (!this.controlledClose) {
        process.exit(1);
        return;
    }
    setTimeout(function() {
        log.info('Monitor --> Closed');
        process.exit(0);
    }, 3000);
};

Monitor.prototype.checkIfReady = function() {
    if (this.dataStoreReady && this.msgBrokerReady) {
        this.onReady();
    }
};

Monitor.prototype.onReady = function() {
    clearTimeout(this.readyTimeout);

    //Emit we are ready
    this.emit('ready');
    log.info('Monitor is ready to work');

    //We want a durable queue, that do not autodeletes on last closed connection,
    //and with HA activated (mirrored in each rabbit server)
    var args = {
        durable: true,
        autoDelete: false,
        arguments: {
            'x-ha-policy': 'all'
        }
    };

    var self = this;
    //Subscribe to the queue once we are ready to start working
    msgBroker.subscribe('newMessages', args, function (msg) {
        self.onNewMessage(msg);
    });

    // Retry UDP messages for unACKed messages
    self.retryUDPnotACKedInterval = setInterval(function retryUDPnotACKed() {
        self.retryUDPnotACKed();
    }, config.retryTime);
};

Monitor.prototype.retryUDPnotACKed = function () {
    var self = this;
    log.debug('Monitor::retryUDPnotACKed --> Starting retry procedure');
    nodes.getUDPClientsAndUnACKedMessages(function (error, nodes) {
        if (error) {
            return;
        }

        if (!Array.isArray(nodes) || !nodes.length) {
            log.debug('Monitor::retryUDPnotACKed --> No pending messages for' +
                'UDP clients');
            return;
        }

        nodes.forEach(function (node) {
            self.onNodeData(node, {});
        });
    });
};


Monitor.prototype.onNodeData = function (nodeData, json) {
    if (!nodeData || !nodeData.si || !nodeData._id) {
        log.error(log.messages.ERROR_BACKENDERROR, {
            class: 'Monitor',
            method: 'onNodeData',
            extra: 'No enough info'
        });
        return;
    }

    // Is the node connected? AKA: is websocket?
    if (nodeData.co === connectionstate.DISCONNECTED) {
        log.debug('Monitor::onNodeData --> Node recovered but not connected, ' +
            'just delaying');
        return;
    }

    log.debug('Monitor::onNodeData --> Node connected:', nodeData);

    log.notify(log.messages.NOTIFY_INCOMING_TO, {
        uaid: nodeData._id,
        appToken: json.app,
        version: json.vs,
        mcc: (nodeData.dt &&
            nodeData.dt.mobilenetwork &&
            nodeData.dt.mobilenetwork.mcc) || 0,
        mnc: (nodeData.dt &&
            nodeData.dt.mobilenetwork &&
            nodeData.dt.mobilenetwork.mnc) || 0
    });
    var body = {
        messageId: json.messageId,
        uaid: nodeData._id,
        dt: nodeData.dt,
        payload: json
    };
    msgBroker.push(nodeData.si, body);
};

Monitor.onNewMessage = function (msg) {
    var json = {};
    try {
        json = JSON.parse(msg);
    } catch (e) {
        log.error(log.messages.ERROR_MONBADJSON);
        return;
    }
    log.debug('Monitor::onNewMessage --> Message from the queue:', json);

    if (!json.app || !json.vs) {
        return;
    }

    app.getNodesByAppToken(json.app, Monitor.onApplicationData, json);
};

Monitor.onApplicationData = function (error, appData, json) {
    if (error) {
        log.error(log.messages.ERROR_MONERROR);
        return;
    }

    log.debug('Monitor::onApplicationData --> Application data recovered:',
        appData);
    appData.forEach(function (nodeData, i) {
        log.debug('Monitor::onApplicationData --> Notifying node: ' +
            i + ':', nodeData);
        Monitor.onNodeData(nodeData, json);
    });
};

var mon = new Monitor();
mon.init();

process.on('SIGINT', function() {
    log.info('Monitor --> Got a SIGINT, stopping');
    mon.stop(true);
});