/**
 * PUSH Notification server
 * (c) Telefonica Digital, 2012 - All rights reserved
 * License: GNU Affero V3 (see LICENSE file)
 * Fernando Rodríguez Sela <frsela@tid.es>
 * Guillermo Lopez Leal <gll@tid.es>
 */

var numCPUs = require('os').cpus().length;

/******************* Servers to run on this machine ********************/
/**
 * Put to true what you want to run
 */
exports.servers = {
    NS_AS: true,
    NS_MSG_MONITOR: true,
    NS_UA_WS: true,
    NS_UA_UDP: true,
    NS_WAKEUP: true
};

////////////////////////////////////////////////////////////////////////
// Common configuration parameters
////////////////////////////////////////////////////////////////////////

/********************* Constants********************************************/
exports.consts = {
    MAX_ID_SIZE: 32,
    PREPRODUCTION_MODE: true,
    /**
     * Default Maximum Time To Live
     * If no provided by AS this TTL will be assigned to the message
     */
    MAX_TTL: 2592000, // 30 days, in seconds (60*60*24*30)
};

/********************* Common Queue ***********************************/
/**
 * Choose your host, port and other self-explanatory options
 * Heartbeat in seconds. 0 => No heartbeat
 */
exports.queue = [
    {
        host: 'localhost',
        port: 5672, //AMQP default port
        login: 'guest',
        password: 'guest',
        heartbeat: 1200
    },
    {
        host: 'localhost',
        port: 5672, //AMQP default port
        login: 'guest',
        password: 'guest',
        heartbeat: 1200
    },
    {
        host: 'localhost',
        port: 5672, //AMQP default port
        login: 'guest',
        password: 'guest',
        heartbeat: 1200
    }
];

/********************* Database configuration *************************/
exports.ddbbsettings = {
    machines: [
        ['localhost', 27017]
    ],
    ddbbname: 'push_notification_server'
};

////////////////////////////////////////////////////////////////////////
//Different configurations for the servers
////////////////////////////////////////////////////////////////////////

/********************* NS_AS *****************************************/
exports.NS_AS = {
    logfile: 'NS_AS.log',

    /**
     * Number of processes which shall run in parallel
     */
    numProcesses: numCPUs,

    /**
     * Maximum payload for a HTTP message (20 KiB)
     */
    MAX_PAYLOAD_SIZE: 20480,

    /**
     * Binding interfaces and ports to listen to. You can have multiple processes.
     */

};

/********************* NS_MSG_MONITOR ********************************/

exports.NS_Monitor = {
    logfile: 'NS_Monitor.log',

    /**
     * Milliseconds to retry to send the UDP packets to wakeup a device
     */
    retryTime: 30000
};

/********************* NS_UA_WS **************************************/

exports.NS_UA_WS = {
    logfile: 'NS_UA_WS.log',

    /**
     * Number of processes which shall run in parallel
     */
    numProcesses: numCPUs,

    /**
     * Maximum size for a WebSocket message (20 KiB)
     */
    MAX_MESSAGE_SIZE: 0x5000, //20480 bytes

    /**
     * Binding interfaces and ports
     * [ iface, port, ssl ]
     */
    interfaces: [
        // Internal network
        {
            ip: '0.0.0.0',
            port: 8080,
            ssl: true        // Enable SSL
        }
    ],

    /**
     * Websocket configuration
     * @see https://github.com/Worlize/WebSocket-Node/blob/master/lib/WebSocketServer.js
     * Be sure to know exactly what are you changing. Short keepaliveIntervals
     * on 3G networks causes a lot of signalling and also dropping too many connections
     * because timeouts on handset status change time.
     * It's disabled because we do not want to track if we have an open connection
     * with a client. It's the client who needs to keep track of it (with a PING message)
     */
    websocket_params: {
        keepalive: false    // By default, currently the KA messages will be managed by the client side
        /*keepaliveInterval: 40000,
         dropConnectionOnKeepaliveTimeout: true,
         keepaliveGracePeriod: 30000*/
    }
};

/********************* NS_UA_UDP *************************************/

exports.NS_UA_UDP = {
    logfile: 'NS_UA_UDP.log'
};

/********************* NS_WAKEUP *************************************/

exports.NS_WAKEUP = {
    logfile: 'NS_WAKEUP.log',

    /**
     * Number of processes which shall run in parallel
     */
    numProcesses: numCPUs,

    /**
     * Binding interfaces and ports
     * [ iface, port, ssl ]
     */
    interfaces: [
        // Internal network
        {
            ip: '0.0.0.0',
            port: 8090,
            ssl: false        // Disable SSL
        }
    ]
};

/********************* NS start.js ***********************************/

exports.NS = {
    logfile: 'NS.log'
};
