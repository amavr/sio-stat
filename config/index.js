const path = require('path');
const log4js = require('log4js');

const cfg = require('./cfg.json');

if (process.env.NODE_ENV === 'production') {
    const home_dir = require('os').homedir();
    const root_dir = path.join(home_dir, '../../');
    const otp_dir = path.join(root_dir, '/otp');
    const otp_app_dir = path.join(otp_dir, '/lenenergo.psk.integration');
    cfg.work_dir = path.join(otp_app_dir, '/IN');
} else {
    cfg.work_dir = 'D:/IE/otp/lenenergo.psk.integration/IN';
}

if(cfg.api.dbname){
    cfg.api.db = cfg.databases[cfg.api.dbname].hrPool;
    cfg.api.db.connectString = cfg.api.db.cs.join('\n');
    cfg.api.db.name = cfg.api.db.cs.join().replace(/.*SERVICE_NAME\s*=\s*(\w+)\W*/gi, '$1')
}

log4js.configure({
    appenders: {
        app: { type: 'dateFile', filename: path.join(cfg.work_dir, cfg.log_dir, 'md.log'), pattern: '.yyyy-MM-dd', daysToKeep: 7 },
        console: { type: 'console' }
    },
    categories: {
        default: { appenders: ['app', 'console'], level: 'debug' }
    }
});

process.env.ORA_SDTZ = 'UTC';

module.exports = cfg;