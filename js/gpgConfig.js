var config = require('../config/gpgTAConfig.json');
var exports = module.exports = clam = require('./digitalSignCheck.js')({
    debug_mode: config.debug_mode, // Whether or not to log info/debug/error msgs to the console
    gpg: {
        path: config.gpg.path // Path to gpg binary
    }
});
