/*
 * PUSH Notification server
 * (c) Telefonica Digital, 2012 - All rights reserved
 * License: GNU Affero V3 (see LICENSE file)
 * Fernando Rodríguez Sela <frsela@tid.es>
 * Guillermo Lopez Leal <gll@tid.es>
 */

'use strict';

var crypto = require('crypto');

function Cryptography() {
}

Cryptography.hashSHA256 = function (data) {
    return crypto.createHash('sha256').update(data).digest('hex');
};

Cryptography.hashSHA512 = function (data) {
    return crypto.createHash('sha512').update(data).digest('hex');
};

Cryptography.generateHMAC = function (data, key) {
    return crypto.createHmac('sha1', key).update(data).digest('hex');
};

module.exports = {
    hashSHA256: Cryptography.hashSHA256,
    hashSHA512: Cryptography.hashSHA512,
    generateHMAC: Cryptography.generateHMAC
};
