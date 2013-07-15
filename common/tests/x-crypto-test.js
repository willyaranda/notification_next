/*
 * PUSH Notification server
 * (c) Telefonica Digital, 2012 - All rights reserved
 * License: GNU Affero V3 (see LICENSE file)
 * Fernando Rodríguez Sela <frsela@tid.es>
 * Guillermo Lopez Leal <gll@tid.es>
 */
'use strict';

var vows = require('vows'),
    assert = require('assert');

var Cryptography = require('../Cryptography.js');

vows.describe('Cryptography tests').addBatch({
    'hashSHA256 - "hola"': {
        topic: Cryptography.hashSHA256('hola'),
        'we got the correct hash': function(hash) {
            assert.equal('b221d9dbb083a7f33428d7c2a3c3198ae925614d70210e28716ccaa7cd4ddb79', hash);
        }
    },
    'hashSHA256 - "hola2"': {
        topic: Cryptography.hashSHA256('hola2'),
        'we got the correct hash': function(hash) {
            assert.equal('3891f13300b85e89d403504b4c26abe3adf5f39420a2d111059423cb25b33b86', hash);
        }
    },
    'hashSHA512 - "hola"': {
        topic: Cryptography.hashSHA512('hola'),
        'we got the correct hash': function(hash) {
            assert.equal('e83e8535d6f689493e5819bd60aa3e5fdcba940e6d111ab6fb5c34f24f86496bf3726e2bf4ec59d6d2f5a2aeb1e4f103283e7d64e4f49c03b4c4725cb361e773', hash);
        }
    },
    'hashSHA512 - "hola2"': {
        topic: Cryptography.hashSHA512('hola2'),
        'we got the correct hash': function(hash) {
            assert.equal('dc78688eca69c3098aefa86a6e29b54f896579c4255b868f09ddf5fb4d699d1ad29c3680240ff9f5fb743b329f49adf25d1150c96c9b9e9fe8111e1717f0f094', hash);
        }
    },
    'generateHMAC - "hola" - "clave"': {
        topic: Cryptography.generateHMAC('hola', 'clave'),
        'we got the correct HMAC': function(hash) {
            assert.equal('22e47577236f6eb549ac3ac008a198af7c4e9061', hash);
        }
    },
    'generateHMAC - "hola2" - "clave"': {
        topic: Cryptography.generateHMAC('hola2', 'clave'),
        'we got the correct HMAC': function(hash) {
            assert.equal('21f2d5fb3ebb40fe5053435af5e5b4976226d01b', hash);
        }
    },
    'generateHMAC - "hola" - "clave2"': {
        topic: Cryptography.generateHMAC('hola', 'clave2'),
        'we got the correct HMAC': function(hash) {
            assert.equal('447f75583ba8b5f8d5c49321594ac907dca11f44', hash);
        }
    },
    'generateHMAC - "hola2" - "clave2"': {
        topic: Cryptography.generateHMAC('hola2', 'clave2'),
        'we got the correct HMAC': function(hash) {
            assert.equal('58666c4dd3e57a4c08678edf6161fabed089029c', hash);
        }
    }
}).export(module); // Export the Suite