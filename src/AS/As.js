/*
 * PUSH Notification server
 * (c) Telefonica Digital, 2012 - All rights reserved
 * License: GNU Affero V3 (see LICENSE file)
 * Fernando Rodríguez Sela <frsela@tid.es>
 * Guillermo Lopez Leal <gll@tid.es>
 */

'use strict';

var urlparser = require('url');
var fs = require('fs');
var cluster = require('cluster');
var events = require('events');
var util = require('util');

var config = require('./config.json');

var msgBroker = require('../common/MsgBroker/MsgBroker');
var pages = require('../common/Pages/Pages.js');
var maintenance = require('../common/Maintenance/Maintenance.js');
var helpers = require('../common/Helpers/Helpers.js');
var log = require('../common/Logger/Logger.js');

function AS() {
    this.ip = null;
    this.port = null;
    this.ssl = false;
    this.ready = false;
    log.init(config.logfile, 'AS', 1);
    events.EventEmitter.call(this);
}
util.inherits(AS, events.EventEmitter);

AS.prototype.init = function (listen) {
    this.ip = listen.ip;
    this.port = listen.port;
    this.ssl = listen.ssl;

    if (cluster.isMaster) {
        // Fork workers.
        for (var i = 0; i < config.numProcesses; i++) {
            cluster.fork();
        }

        cluster.on('exit', function (worker, code) {
            if (code !== 0) {
                log.error(log.messages.ERROR_WORKERERROR, {
                    pid: worker.process.pid,
                    code: code
                });
            } else {
                log.debug('AS::init --> Worker ' + worker.process.pid + ' exit');
            }
        });
    } else {
        // Create a new HTTP(S) Server
        if (this.ssl) {
            var options = {
                ca: helpers.getCaChannel(),
                key: fs.readFileSync(config.key),
                cert: fs.readFileSync(config.cert),
                requestCert: false,
                rejectUnauthorized: false
            };
            this.server = require('https').createServer(
                options,
                this.onHTTPMessage.bind(this)
            );
        } else {
            this.server = require('http').createServer(
                this.onHTTPMessage.bind(this)
            );
        }
        this.server.listen(this.port, this.ip);
        log.debug('AS::init --> Push AS server starting on http' +
            (this.ssl ? 's' : '') + '://' + this.ip + ':' + this.port);

        var self = this;
        // Events from msgBroker
        msgBroker.once('connected', function () {
            log.debug('AS::init --> MsgBroker ready and connected');
            self.onReady();
        });
        msgBroker.on('disconnected', function () {
            log.critical(log.messages.CRITICAL_MBDISCONNECTED, {
                class: 'AS',
                method: 'init'
            });
            self.msgbrokerready = false;
        });

        //Wait until we have setup our events listeners
        process.nextTick(function () {
            msgBroker.init(config.queues);
        });

        // Check if we are alive
        this.readyTimeout = setTimeout(function () {
            log.critical(log.messages.CRITICAL_NOTREADY);
        }, 30 * 1000); //Wait 30 seconds
    }
};

AS.prototype.onReady = function() {
    // For workers, clean timeouts or intervals
    clearTimeout(this.readyTimeout);
    this.ready = true;
    log.info('AS::init --> Push AS server started on http' +
        (this.ssl ? 's' : '') + '://' + this.ip + ':' + this.port);
    this.emit('ready');
};

AS.prototype.stop = function (controlled) {
    this.emit('closing');
    if (cluster.isMaster) {
        setTimeout(function () {
            process.exit(0);
        }, 10000);
        return;
    }
    var self = this;
    this.server.close(function () {
        log.info('AS::stop --> AS server closed correctly');
        self.ready = false;
    });
};

AS.prototype.onHTTPMessage = function (request, response) {
    var self = this;
    if (!this.ready) {
        log.debug('AS::onHTTPMessage --> Message rejected, we' +
            'are not ready yet');
        response.statusCode = 503;
        response.end();
        return;
    }

    log.debug('AS::onHTTPMessage --> Received request for ' + request.url);
    var url = urlparser.parse(request.url, true);
    var path = url.pathname.split('/');

    // CORS support
    if (request.method === 'OPTIONS') {
        log.debug('AS::onHTTPMessage --> Received an OPTIONS method');
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'POST, PUT, GET, OPTIONS');
        response.end();

    } else if (request.method === 'PUT') {
        log.debug('AS::onHTTPMessage --> Received a PUT');
        var body = '';

        request.on('data', function (data) {
            body += data;
            // Max. payload: "version=9007199254740992" => length: 24
            if (body.length > 25) {
                log.debug('AS::onHTTPMessage --> Message rejected, too ' +
                    'long for this API');
                request.tooBig = true;
                response.statusCode = 400;
                response.end();
                request.emit('end');
            }
        });

        request.on('end', function () {
            if (request.tooBig) {
                return;
            }
            self.processSimplePushV1(request, body, response);
        });

    } else if (request.method === 'GET') {
        if (path[1] === 'about') {
            AS.handleAbout(response);
        } else if (path[1] === 'status') {
            AS.handleStatus(response);
        } else {
            log.debug("AS::onHTTPMessage --> messageType '" +
                path[1] + "' not recognized");
            response.statusCode = 400;
            response.end();
        }

    // HTTP method not known
    } else {
        response.statusCode = 405;
        response.end();
    }
};

AS.prototype.processSimplePushV1 = function(request, body, response) {
    var kSimplePushASFrontendVersion = 'v1';
    var URI = request.url.split('/');
    if (URI.length < 3) {
        response.statusCode = 404;
        response.end('{ reason: "Not enough path data"}');
        log.debug('NS_UA_SimplePush_v1::processRequest --> Not enough path');
        return;
    }

    if (URI[1] !== kSimplePushASFrontendVersion) {
        response.statusCode = 400;
        response.end('{ reason: "Protocol version not supported"}');
        log.debug('NS_UA_SimplePush_v1::processRequest --> Version not supported, ' +
            'received: ' + URI[1]);
        return;
    }

    if (URI[2] !== 'notify') {
        response.statusCode = 404;
        response.end('{ reason: "API not known"}');
        log.debug('NS_UA_SimplePush_v1::processRequest --> API call not known,' +
            'received: ' + URI[2]);
        return;
    }

    var appToken = URI[3];
    if (!appToken) {
        response.statusCode = 404;
        response.end('{ reason: "Not enough path data"}');
        log.debug('NS_UA_SimplePush_v1::processRequest --> Not enough path');
        return;
    }

    var versions = String(body).split('=');
    if (versions[0] !== 'version') {
        response.statusCode = 404;
        response.end('{ reason: "Bad body"}');
        log.debug('NS_UA_SimplePush_v1::processRequest --> Bad body,' +
            'received lhs: ' + versions[0]);
        return;
    }

    var version = versions[1];
    if (!helpers.isVersion(version)) {
        response.statusCode = 404;
        response.end('{ reason: "Bad version"}');
        log.debug('NS_UA_SimplePush_v1::processRequest --> Bad version, ' +
            'received rhs: ' + version);
        return;
    }

    //Now, we are safe to start using the path and data
    log.notify(log.messages.NOTIFY_APPTOKEN_VERSION, {
        appToken: appToken,
        version: version,
        ip: request.connection.remoteAddress || null
    });

    // Send the OK response always, this free some server resources
    response.statusCode = 200;
    //CORS support
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.end('{}');

    //And now we proccess the notification, just pushing to the broker
    var msg = {};
    msg.app = appToken;
    msg.vs = parseInt(version, 10);
    msgBroker.push('newMessages', msg);
};

AS.handleAbout = function(response) {
    if (config.PREPRO) {
        var text = '';
        try {
            var p = new pages();
            p.setTemplate('views/about.tmpl');
            text = p.render(function (t) {
                switch (t) {
                    case '{{GIT_VERSION}}':
                        return fs.readFileSync('version.info');
                    case '{{MODULE_NAME}}':
                        return 'Application Server Frontend';
                    default:
                        return '';
                }
            });
        } catch (e) {
            text = "No version.info file";
        }
        response.setHeader('Content-Type', 'text/html');
        response.statusCode = 200;
        response.write(text);
        response.end();
    } else {
        response.statusCode = 401;
        response.end();
    }
};

AS.handleStatus = function(response) {
    // Return status mode to be used by load-balancers
    if (maintenance.isActive()) {
        response.statusCode = 503;
    } else {
        response.statusCode = 200;
    }
    response.end();
};

var as = new AS();
as.init(config.listen);

process.on('SIGINT', function() {
    log.info('AS --> Got a SIGINT, stopping');
    as.stop(true);
    process.exit(1);
});