const promise       = require('promise');
const fs            = require('fs');
const ncp           = require('ncp').ncp;
const xml2js        = require('xml2js');
var Client          = require('ssh2').Client;
const telegram_bot  = require('../util/telegramBot.js');
const { relativeTimeRounding } = require('moment');


const CreateFolders = function(sftp, folders, batchId, cb) {
    if (!folders.length) {
        cb && cb();
    } else {
        const FOLDER = folders.shift();
        sftp.mkdir(FOLDER, function(dirErr) {
            if (dirErr) {
                cb && cb(dirErr);
            } else {
                console.log('folder - ' + FOLDER + ' has been created.');
                telegram_bot.sendMessages(' KKbox: '+'folder - ' + FOLDER + ' has been created.', batchId);
                CreateFolders(sftp, folders, batchId, cb);
            }
        });
    }
};
const UploadFiles = function(sftp, files, batchId, cb) {
    if (!files.length) {
        cb && cb();
    } else {
        const FILE = files.shift();
        // local path, remote path
        sftp.fastPut(FILE.local, FILE.remote, function(fileErr) {
            if (fileErr) {
                cb && cb(fileErr);
            } else {
                console.log('file - ' + FILE.remote + ' has been created.');
                telegram_bot.sendMessages(' KKbox: '+'file - ' + FILE.remote + ' has been uploaded.', batchId);
                UploadFiles(sftp, files, batchId, cb);
            }
        });
    }
};



module.exports = function(platform, dir, batchId, upc, xmlWrapper, files) {
    return new promise((resolve, reject) => {
        // create platform dir
        const platformDir = dir + '/' + platform.alias;
        // create dir for storing spotify album info
        !fs.existsSync(platformDir) && fs.mkdirSync(platformDir);

        // create batch dir
        const batchDir = platformDir + '/' + batchId;
        fs.mkdirSync(batchDir);

        // setup album dir
        const albumDir = batchDir + '/' + upc;

        // update file paths
        files = files.map(f => ({
            local: f.path,
            remote: platform.remoteDir + '/' + batchId + '/' + upc + f.path.replace(dir + '/batch_' + batchId + '/' + batchId, '')
        }));


        // create batch dir
        ncp(dir + '/batch_' + batchId + '/' + batchId, albumDir, cpyRrr => {
            if (cpyRrr) {
                reject(cpyRrr);
            } else {
                xmlWrapper["ern:NewReleaseMessage"].MessageHeader[0].MessageRecipient[0].PartyId[0] = platform.id;
                xmlWrapper["ern:NewReleaseMessage"].MessageHeader[0].MessageRecipient[0].PartyName[0].FullName[0] = platform.name;

                var builder = new xml2js.Builder();
                var xml = builder.buildObject(xmlWrapper);
                var xmlPath = albumDir + '/' + upc + '.xml';

                // save xml
                fs.writeFileSync(xmlPath, xml);

                files[0] = {
                    local: xmlPath,
                    remote: platform.remoteDir + '/' + batchId + '/' + upc + '/' + upc + '.xml'
                };
                files.push({
                    local: xmlPath,
                    remote: platform.remoteDir + '/' + batchId + '/BatchComplete_' + batchId + '.complete'
                });
                console.log(files);
                
                // ssh2
                var conn = new Client();
                conn.on('ready', () => conn.sftp(function(sftpErr, sftp) {
                    if (sftpErr) {
                        reject(sftpErr);
                    } else {
                        // log
                        console.log('sftp connection of ' + platform.name + ' ready.');
                        // create folders
                        CreateFolders(sftp, [
                            platform.remoteDir + '/' + batchId,
                            platform.remoteDir + '/' + batchId + '/' + upc,
                            platform.remoteDir + '/' + batchId + '/' + upc + '/resources'
                        ], batchId, creatingDirsErr => {
                            if (creatingDirsErr) {
                                reject(creatingDirsErr);
                            } else {
                                // log
                                console.log('album related dirs are created.');
                                UploadFiles(sftp, files, batchId, () => {
                                    // log
                                    console.log('all files are created.');
                                    telegram_bot.sendMessages(' KKbox: '+'Done.', batchId);
                                    // all done
                                    resolve();
                                });
                            }
                        });
                    }
                })).connect({
                    host: platform.host,
                    port: platform.port,
                    username: platform.username,
                    privateKey: fs.readFileSync('./cert/id_rsa'),
                    algorithms: {
                        serverHostKey: [
                            'ssh-rsa',
                            'ssh-dss',
                            'ecdsa-sha2-nistp256',
                            'ecdsa-sha2-nistp384',
                            'ecdsa-sha2-nistp521'
                        ],
                        kex: [
                            'ecdh-sha2-nistp256',
                            'ecdh-sha2-nistp384',
                            'ecdh-sha2-nistp521',
                            'diffie-hellman-group-exchange-sha256',
                            'diffie-hellman-group14-sha1',
                            'diffie-hellman-group-exchange-sha1',
                            'diffie-hellman-group1-sha1'
                        ],
                        cipher: [
                            'aes128-ctr',
                            'aes192-ctr',
                            'aes256-ctr',
                            'aes128-gcm',
                            'aes128-gcm@openssh.com',
                            'aes256-gcm',
                            'aes256-gcm@openssh.com',
                            'aes256-cbc',
                            'aes192-cbc',
                            'aes128-cbc',
                            'blowfish-cbc',
                            '3des-cbc',
                            'arcfour256',
                            'arcfour128',
                            'cast128-cbc',
                            'arcfour'
                        ],
                        hmac: [
                            'hmac-sha2-256',
                            'hmac-sha2-512',
                            'hmac-sha1',
                            'hmac-md5',
                            'hmac-sha2-256-96',
                            'hmac-sha2-512-96',
                            'hmac-ripemd160',
                            'hmac-sha1-96',
                            'hmac-md5-96'
                        ]
                    }
                });
            }
        });
    });
}