/* jshint node: true */
/**
 * PUSH Notification server
 * (c) Telefonica Digital, 2012 - All rights reserved
 * License: GNU Affero V3 (see LICENSE file)
 * Fernando Rodríguez Sela <frsela@tid.es>
 * Guillermo Lopez Leal <gll@tid.es>
 */

var config = require('./config.js'),
    log = require('./common/Logger.js'),
    os = require('os');

////////////////////////////////////////////////////////////////////////////////
function generateServerId() {
    process.serverId = os.type() + '-' + os.release() + '#' +
        os.hostname() + '#' + process.pid;
    return process.serverId;
}
////////////////////////////////////////////////////////////////////////////////

function main() {
    this.server = null;
    this.controlledClose = false;
}

main.prototype = {
    start: function () {
        // Generate a new server ID
        log.info('Server ID: ' + generateServerId());
        var sel = null;
        // Look for what server type we are running
        // and start what is needed
        switch (process.argv[2]) {
            case 'NS_UA_WS':
                log.init(config.NS_UA_WS.logfile, 'NS_UA_WS', 1);
                log.info('Starting as NS_UA_WS server');
                sel = require('./UA/ws_main.js');
                this.server = new sel.NS_UA_WS_main();
                this.server.start();
                break;
            case 'NS_UA_UDP':
                log.init(config.NS_UA_UDP.logfile, 'NS_UA_UDP', 1);
                log.info('Starting as NS_UA_UDP server');
                sel = require('./WakeUp/udp_main.js');
                this.server = new sel.NS_UA_UDP_main();
                this.server.start();
                break;
            case 'NS_AS':
                log.init(config.NS_AS.logfile, 'NS_AS', 1);
                log.info('Starting NS_AS server');
                sel = require('./AS/as_main.js');
                this.server = new sel.NS_AS_main();
                this.server.start();
                break;
            case 'Monitor':
                log.init(config.NS_Monitor.logfile, 'NS_MSG_MONITOR', 1);
                log.info('Starting NS_MSG_MONITOR server');
                sel = require('./Monitor/Monitor.js');
                this.server = new sel();
                this.server.start();
                break;
            case 'NS_WAKEUP':
                log.init(config.NS_WAKEUP.logfile, 'NS_WAKEUP', 1);
                log.info('Starting as NS_WAKEUP server');
                sel = require('./WakeUp/wakeup_main.js');
                this.server = new sel.NS_WakeUp_main();
                this.server.start();
                break;
            default:
                log.init('/tmp/push.log', 'PUSH', 1);
                log.error(log.messages.ERROR_NOSERVERPROVIDED);
        }
    },

    stop: function () {
        log.info('Closing the server correctly');
        this.server.stop();
    }
};

/////////////////////////
// Run the server
/////////////////////////
var m = new main();
m.start();

/////////////////////////
// On close application
function onClose() {
    if (m.controlledClose) {
        return;
    }
    m.controlledClose = true;
    log.info('Received interruption (2) signal');
    m.stop();
}

function onKill() {
    if (m.controlledClose) {
        return;
    }
    m.controlledClose = true;
    log.error(log.messages.ERROR_RECVKILLSIGNAL);
    m.stop();
}

process.on('SIGINT', onClose);    // 2
process.on('SIGTERM', onKill);    // 15
