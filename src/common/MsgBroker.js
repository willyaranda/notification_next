/* jshint node: true */
/**
 * PUSH Notification server
 * (c) Telefonica Digital, 2012 - All rights reserved
 * License: GNU Affero V3 (see LICENSE file)
 * Fernando Rodríguez Sela <frsela@tid.es>
 * Guillermo Lopez Leal <gll@tid.es>
 */

'use strict';

var amqp = require('amqp');
var log = require('./Logger/Logger.js');
var events = require('events');
var util = require('util');
var helpers = require('./Helpers/Helpers.js');

var gControlledClose = false;

// Constants
var QUEUE_DISCONNECTED = 0;
var QUEUE_CREATED = 1;
var QUEUE_ERROR = 2;
var QUEUE_CONNECTED = 3;

var MsgBroker = function () {
    events.EventEmitter.call(this);
    this.queues = [];
    this.conns = [];
    this.callbacks = [];
};
util.inherits(MsgBroker, events.EventEmitter);

MsgBroker.prototype.callbackReady = function (callback) {
    if (this.ready) {
        callback(true);
        return;
    }
    this.callbacks.push(helpers.checkCallback(callback));
};

MsgBroker.prototype.init = function (queuesConf, cb) {
    log.debug('msgBroker::queue.init --> Connecting to the queue servers');
    this.callbackReady(cb);

    //Create connection to the broker
    if (!Array.isArray(queuesConf)) {
        queuesConf = [queuesConf];
    }

    for (var i = queuesConf.length - 1; i >= 0; i--) {
        this.createConnection(queuesConf[i]);
    }

    var self = this;
    this.on('connected', function() {
        var callbacks = self.callbacks || [];
        callbacks.forEach(function(elem) {
            elem(true);
        });
    })
};

MsgBroker.prototype.close = function (controlled) {
    gControlledClose = controlled;
    this.queues.forEach(function (element) {
        if (element.queue) {
            element.end();
        }
    });
    log.info('msgbroker::close --> Closing connection to msgBroker');
};

MsgBroker.prototype.subscribe = function (queueName, args, callback) {
    this.queues.forEach(function (connection) {
        if (!connection) {
            return;
        }
        connection.queue(queueName, args, function (q) {
            log.info('msgbroker::subscribe --> Subscribed to queue: ' + queueName);
            q.bind('#');
            q.subscribe(function (message) {
                return callback(message.data);
            });
        });
    });
};

/**
 * Insert a new message into the queue
 */
MsgBroker.prototype.push = function (queueName, body) {
    log.debug('msgbroker::push --> Sending to the queue ' + queueName + ' the package:', body);
    //Send to one of the connections that is connected to a queue
    var sent = false;
    this.queues.forEach(function (connection) {
        if (connection && !sent) {
            connection.publish(queueName, JSON.stringify(body));
            sent = true;
        }
    });
};

MsgBroker.prototype.createConnection = function (queuesConf) {
    var conn = new amqp.createConnection({
        port: queuesConf.port,
        host: queuesConf.host,
        login: queuesConf.login,
        password: queuesConf.password,
        heartbeat: queuesConf.heartbeat
    });
    conn.state = QUEUE_CREATED;
    conn.id = Math.random();
    this.conns.push(conn);

    // Events for this queue
    var self = this;
    conn.on('ready', (function () {
        conn.state = QUEUE_CONNECTED;
        log.info("msgbroker::queue.ready --> Connected to one Message Broker");
        self.queues.push(conn);
        self.emit('connected');
    }));

    conn.on('close', (function () {
        var index = self.queues.indexOf(conn);
        if (index >= 0) {
            self.queues.splice(index, 1);
        }
        var length = self.queues.length;
        var allDisconnected = self.conns.every(self.allDisconnected);
        var pending = self.conns.some(self.pending);
        if (length === 0 && allDisconnected && !pending) {
            if (!gControlledClose) {
                self.emit('disconnected');
            }
            self.close();
        }
        if (conn.state === QUEUE_CONNECTED) {
            conn.state = QUEUE_DISCONNECTED;
        }
    }));

    conn.on('error', (function (error) {
        log.error(log.messages.ERROR_MBCONNECTIONERROR, {
            "error": error
        });
        conn.state = QUEUE_ERROR;
    }));

    conn.on('heartbeat', (function () {
        log.debug('msgbroker::heartbeat');
    }));
};

MsgBroker.prototype.allDisconnected = function (element) {
    return element.state !== QUEUE_DISCONNECTED;
};

MsgBroker.prototype.pending = function (element) {
    return element.state !== QUEUE_CREATED;
};

var _msgbroker = new MsgBroker();
function getMsgBroker() {
    return _msgbroker;
}

module.exports = getMsgBroker();