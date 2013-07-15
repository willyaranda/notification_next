/*
 * PUSH Notification server
 * (c) Telefonica Digital, 2012 - All rights reserved
 * License: GNU Affero V3 (see LICENSE file)
 * Fernando Rodríguez Sela <frsela@tid.es>
 * Guillermo Lopez Leal <gll@tid.es>
 */

'use strict';

exports.connectionstate = {
    DISCONNECTED: 0,
    CONNECTED: 1,
    UDP: 2,
    WAPPUSH: 3
};

exports.statuscodes = {
    OK: 200,
    REGISTERED: 200,
    REGISTERED_UDP: 201,
    REGISTERED_WAPPUSH: 202,
    UNREGISTERED: 220
};