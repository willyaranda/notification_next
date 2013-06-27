/*
 * PUSH Notification server
 * (c) Telefonica Digital, 2012 - All rights reserved
 * License: GNU Affero V3 (see LICENSE file)
 * Fernando Rodríguez Sela <frsela@tid.es>
 * Guillermo Lopez Leal <gll@tid.es>
 */

'use strict';

exports.loglevels = {
    // Log levels bitwise
    NONE: 0,
    CRITICAL: 1,
    DEBUG: 2,
    INFO: 4,
    ERROR: 8,
    NOTIFY: 16,
    ALERT: 32,
    ALARM: 64
};

exports.errorcodes = {
    200: [200, 'Ok'],
    400: [400, 'Generic error'],
    404: [404, 'Not Found'],
    403: [403, 'Not allowed on production system'],
    500: [500, 'Not ready yet: Try again later']
};

exports.connectionstate = {
    DISCONNECTED: 0,
    CONNECTED: 1,
    WAKEUP: 2
};

exports.statuscodes = {
    OK: 200,
    REGISTERED: 200,
    UDPREGISTERED: 201,
    UNREGISTERED: 202
};