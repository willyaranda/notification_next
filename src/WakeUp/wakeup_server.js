/* jshint node: true */
/**
 * PUSH Notification server
 * (c) Telefonica Digital, 2012 - All rights reserved
 * License: GNU Affero V3 (see LICENSE file)
 * Fernando Rodríguez Sela <frsela@tid.es>
 * Guillermo Lopez Leal <gll@tid.es>
 */

var log = require('../common/Logger/Logger.js'),
    net = require('net'),
    fs = require('fs'),
    config = require('../config.js').NS_WAKEUP,
    cluster = require('cluster'),
    consts = require('../config.js').consts,
    dgram = require('dgram'),
    pages = require('../common/Pages/Pages.js'),
    maintenance = require('../common/Maintenance/Maintenance.js'),
    helpers = require('../common/Helpers/Helpers.js');

function server(ip, port, ssl) {
    this.ip = ip;
    this.port = port;
    this.ssl = ssl;
}

server.prototype = {
    // Constants
    PROTOCOL_UDPv4: 1,
    PROTOCOL_TCPv4: 2,

    //////////////////////////////////////////////
    // Constructor
    //////////////////////////////////////////////

    init: function () {
        if (cluster.isMaster) {
            // Fork workers.
            for (var i = 0; i < config.numProcesses; i++) {
                cluster.fork();
            }

            cluster.on('exit', function (worker, code, signal) {
                if (code !== 0) {
                    log.error(log.messages.ERROR_WORKERERROR, {
                        "pid": worker.process.pid,
                        "code": code
                    });
                } else {
                    log.info('worker ' + worker.process.pid + ' exit');
                }
            });
        } else {
            log.info('Starting WakeUp server');

            // Create a new HTTP(S) Server
            if (this.ssl) {
                var options = {
                    ca: helpers.getCaChannel(),
                    key: fs.readFileSync(consts.key),
                    cert: fs.readFileSync(consts.cert)
                };
                this.server = require('https').createServer(options, this.onHTTPMessage.bind(this));
            } else {
                this.server = require('http').createServer(this.onHTTPMessage.bind(this));
            }
            this.server.listen(this.port, this.ip);
            log.info('NS_WAKEUP::init --> HTTP' + (this.ssl ? 'S' : '') +
                ' push WakeUp server starting on ' + this.ip + ':' + this.port);
        }
    },

    stop: function () {
        if (cluster.isMaster) {
            setTimeout(function () {
                process.exit(0);
            }, 10000);
            return;
        }
        this.server.close(function () {
            log.info('NS_WAKEUP::stop --> NS_WAKEUP closed correctly');
        });
    },

    //////////////////////////////////////////////
    // HTTP callbacks
    //////////////////////////////////////////////
    onHTTPMessage: function (request, response) {
        var msg = '';
        log.notify(log.messages.NOTIFY_RECEIVEDREQUESTFORURL, {
            url: request.url
        });

        if (request.url === "/about") {
            if (consts.PREPRODUCTION_MODE) {
                try {
                    var p = new pages();
                    p.setTemplate('views/about.tmpl');
                    var text = p.render(function (t) {
                        switch (t) {
                            case '{{GIT_VERSION}}':
                                return require('fs').readFileSync('version.info');
                            case '{{MODULE_NAME}}':
                                return 'WakeUp UDP/TCP Server';
                            default:
                                return "";
                        }
                    });
                } catch (e) {
                    text = "No version.info file";
                }
                response.setHeader("Content-Type", "text/html");
                response.statusCode = 200;
                response.write(text);
                return response.end();
            } else {
                response.statusCode = 405;
                return response.end();
            }
        }

        if (request.url === "/status") {
            // Return status mode to be used by load-balancers
            response.setHeader('Content-Type', 'text/html');
            if (maintenance.getStatus()) {
                response.statusCode = 503;
                response.write('Under Maintenance');
            } else {
                response.statusCode = 200;
                response.write('OK');
            }
            return response.end();
        }

        var WakeUpHost = this.parseURL(request.url).parsedURL.query;
        if (!WakeUpHost.ip || !WakeUpHost.port) {
            log.debug('NS_WAKEUP::onHTTPMessage --> URL Format error - discarding');
            msg = '{"status": error, "reason": "URL Format Error"}';
            response.setHeader('Content-Type', 'text/plain');
            response.statusCode = 404;
            response.write(msg);
            return response.end();
        }

        // Check parameters
        if (!net.isIP(WakeUpHost.ip) ||     // Is a valid IP address
            isNaN(WakeUpHost.port) ||       // The port is a Number
            WakeUpHost.port < 0 || WakeUpHost.port > 65535  // The port has a valid value
            ) {
            log.debug('NS_WAKEUP::onHTTPMessage --> Bad IP/Port');
            msg = '{"status": error, "reason": "Bad parameters. Bad IP/Port"}';
            response.setHeader('Content-Type', 'text/plain');
            response.statusCode = 404;
            response.write(msg);
            return response.end();
        }

        // Check protocolo
        var protocol = this.PROTOCOL_UDPv4;
        if (WakeUpHost.proto && WakeUpHost.proto == 'tcp') {
            protocol = this.PROTOCOL_TCPv4;
        }

        log.debug('NS_WAKEUP::onHTTPMessage --> WakeUp IP = ' + WakeUpHost.ip + ':' + WakeUpHost.port + ' (protocol=' + protocol + ')');
        var message = new Buffer('NOTIFY ' + JSON.stringify(WakeUpHost));
        switch (protocol) {
            case this.PROTOCOL_TCPv4:
                // TCP Notification Message
                var tcp4Client = net.createConnection({host: WakeUpHost.ip, port: WakeUpHost.port},
                    function () { //'connect' listener
                        log.debug('TCP Client connected');
                        tcp4Client.write(message);
                        tcp4Client.end();
                    });
                tcp4Client.on('data', function (data) {
                    log.debug('TCP Data received: ' + data.toString());
                });
                tcp4Client.on('error', function (e) {
                    log.debug('TCP Client error ' + JSON.stringify(e));
                    log.notify(log.messages.NOTIFY_WAKEUPPACKAGEFAILED, {
                        ip: WakeUpHost.ip,
                        port: WakeUpHost.port
                    });

                    response.statusCode = 404;
                    response.setHeader('Content-Type', 'text/plain');
                    response.write('{"status": error, "reason": "TCP Connection error"}');
                    return response.end();
                });
                tcp4Client.on('end', function () {
                    log.debug('TCP Client disconected');
                    log.notify(log.messages.NOTIFY_WAKEUPPACKAGEOK, {
                        ip: WakeUpHost.ip,
                        port: WakeUpHost.port
                    });

                    response.statusCode = 200;
                    response.setHeader('Content-Type', 'text/plain');
                    response.write('{"status": "OK"}');
                    return response.end();
                });
                break;
            case this.PROTOCOL_UDPv4:
                // UDP Notification Message
                var udp4Client = dgram.createSocket('udp4');
                udp4Client.send(
                    message, 0, message.length,
                    WakeUpHost.port, WakeUpHost.ip,
                    function (err, bytes) {
                        if (err) {
                            log.info('Error sending UDP Datagram to ' + WakeUpHost.ip + ':' + WakeUpHost.port);
                        }
                        else {
                            log.notify(log.messages.NOTIFY_WAKEUPPACKAGEUDPDGRAMSENT, {
                                ip: WakeUpHost.ip,
                                port: WakeUpHost.port
                            });
                            udp4Client.close();
                        }
                    });

                response.statusCode = 200;
                response.setHeader('Content-Type', 'text/plain');
                response.write('{"status": "OK"}');
                return response.end();
                break;

            default:
                log.error(log.messages.ERROR_WAKEUPPROTOCOLNOTSUPPORTED);
                response.statusCode = 404;
                response.setHeader('Content-Type', 'text/plain');
                response.write('{"status": error, "reason": "Protocol not supported"}');
                return response.end();
        }
    },

    ///////////////////////
    // Auxiliar methods
    ///////////////////////
    parseURL: function (url) {
        var urlparser = require('url'),
            data = {};
        data.parsedURL = urlparser.parse(url, true);
        return data;
    }
};

// Exports
exports.server = server;
