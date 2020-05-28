const promise       = require('promise');
const fs            = require('fs');
const path          = require('path');
const ncp           = require('ncp').ncp;
const xml2js        = require('xml2js');;
const xmlcrypto     =require('xml-crypto').SignedXml;
const crypto        =require('crypto');
var Client          = require('ssh2').Client;
const telegram_bot  = require('../util/telegramBot.js');


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
                telegram_bot.sendMessages(' Spotify: ' + 'folder - ' + FOLDER + ' has been created.',batchId);
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
        //console.log('FILE:'+JSON.stringify(FILE));
        // local path, remote path
        sftp.fastPut(FILE.local, FILE.remote, function(fileErr) {
            if (fileErr) {
                console.log('file error:'+fileErr);
                cb && cb(fileErr);
            } else {
                console.log('file - ' + FILE.remote + ' has been uploaded.');
                telegram_bot.sendMessages(' Spotify: ' + 'file - ' + FILE.remote + ' has been uploaded.',batchId);
                UploadFiles(sftp, files, batchId, cb);
            }
        });
    } 
    
};
/*
const signXml = function(originalXml,reference){
    new Promise((resolve,reject) =>{
        var signature = new xmlcrypto();
        signature.addReference(reference,[],"http://www.w3.org/2001/04/xmlenc#sha256");
        signature.signingKey = fs.readFileSync(path.resolve('./util/cert/aws-ocs.pem'));
        signature.computeSignature(new xml2js.Builder().buildObject(originalXml));
        
        xml2js.parseString(signature.getSignedXml(), function (err, result) {
            console.log("error",err);
            if (err)
                reject();
            else{
                console.log("Signature",JSON.stringify(result.root.Signature));
                resolve(result.root.Signature);
            }
        });
    })
}

async function getCompleteSignedXml(manifestContent,otherInfoMessage){
    manifestContent.MessageHeader[0].XmlChoice[0].Signature = await signXml(manifestContent,"//*[local-name(.)='MessageHeader']");
    otherInfoMessage.MessageInBatch[0].XmlChoice[0].Signature = await signXml(otherInfoMessage,"//*[local-name(.)='MessageInBatch']");

    return ({ ...manifestContent, ...otherInfoMessage})

}
*/

module.exports = function(platform, dir, batchId, upc, xmlWrapper, files) {
    return new promise((resolve, reject) => {
        telegram_bot.sendMessages('enter ' + platform.name + ' uploader.',batchId);
        //sportify folder format need to be yyyymmdd_hhmmss
        const dateformatter = {
            year:"numeric",
            month:"2-digit",
            day:"2-digit"
        };
        const date = new Date().toLocaleDateString('default',dateformatter).split('/');
        //console.log('date:'+date);
        //console.log('time:'+new Date().toLocaleTimeString().split(':'));

        const time = new Date().toLocaleTimeString('default',{hour12: false}).split(':').join('').split(' ')[0];
        const millisecond = new Date().getMilliseconds();

        //format:YYYYMMDDHHMMSSsssgit 
        //console.log(date[2]+date[0]+date[1]+'_'+time+millisecond);
        const foldername = date[2]+date[0]+date[1]+time+millisecond; 

        // create platform dir
        const platformDir = dir + '/' + platform.alias;

        // create dir for storing spotify album info
        !fs.existsSync(platformDir) && fs.mkdirSync(platformDir);
        // create batch dir
        const batchDir = platformDir + '/' + batchId;
        fs.mkdirSync(batchDir);

        // setup album dir
        const albumDir = batchDir + '/' + upc;
        console.log('------original files------');
        console.log(files);
        // update file paths
        files = files.map(f => ({
            local: f.path,
            //remote: platform.remoteDir + '/test' + batchId + '/' + upc + f.path.replace(dir + '/batch_' + batchId + '/' + batchId, '')
            remote: platform.remoteDir + '/test/' + foldername + '/' + upc + f.path.replace(dir + '/batch_' + batchId + '/' + batchId, '')
        }));
        telegram_bot.sendMessages(' Spotify: ' + 'create batch dir',batchId);
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
                fs.writeFileSync(xmlPath, xml)
                
                //create digital signature 
                new Promise(function(resolve) {

                /*create manifest batch complete xml*/
                var manifestWrapper = require(`../util/sample_spotify/BatchComplete/Wrapper.json`);
                var BatchCompletetTemplate  = require(`../util/sample_spotify/BatchComplete/ManifestContent.json`);

                var manifestContent = JSON.parse(JSON.stringify(BatchCompletetTemplate));
                const originalxmlrootpath = '/twentytwo/test/'+ foldername;
                const originalxmlpath =  '/twentytwo/test/'+ foldername + '/' + upc + '/' + upc + '.xml';
                

                manifestContent["echo:ManifestMessage"].MessageHeader[0].MessageCreatedDateTime = new Date().toISOString().replace("Z","+08:00");
                manifestContent["echo:ManifestMessage"].MessageInBatch[0].IncludedReleaseId[0].GRid.push(upc);
                manifestContent["echo:ManifestMessage"].MessageInBatch[0].URL = originalxmlpath;
                manifestContent["echo:ManifestMessage"].RootDirectory = originalxmlrootpath;


                var builder = new xml2js.Builder();
                const manifestContentXml = builder.buildObject(manifestContent);

                const manifestContentHash = crypto.createHash('md5').update(manifestContentXml, 'utf8').digest('hex');
                //console.log("hash:",manifestContentHash);
                manifestContent["echo:ManifestMessage"].MessageInBatch[0].HashSum[0].HashSum = manifestContentHash;
                manifestContent["echo:ManifestMessage"].MessageInBatch[0].HashSum[0].HashSumAlgorithmType = "MD5";
                resolve(manifestContent);
                /*    
                var headersignature = new xmlcrypto();
                headersignature.addReference("//*[local-name(.)='MessageHeader']",[],"http://www.w3.org/2001/04/xmlenc#sha256");
                headersignature.signingKey = fs.readFileSync(path.resolve('./util/cert/aws-ocs.pem'));
                headersignature.computeSignature(new xml2js.Builder().buildObject(manifestContent));
                
                xml2js.parseString(headersignature.getSignedXml(), function (err, result) {
                    console.log("Header Signature:",JSON.stringify(result.root.Signature));
                    //assign signature and hashsum to json
                    manifestContent.MessageHeader[0].XmlChoice[0].HashSum[0].HashSum = manifestContentHash;
                    manifestContent.MessageHeader[0].XmlChoice[0].Signature = result.root.Signature;
                    
                });
                */
                }).then(manifestContent =>{
                //merge two json into a object
                //const merge = { ...manifestContent, ...OtherInfoContent};
                //manifestWrapper['echo:ManifestMessage'] = {...manifestWrapper['ccho:ManifestMessage'], ...merge};
                //console.log("manifestXML",JSON.stringify(manifestContent));

                //build manifestMessage xml
                var manifestBuilder = new xml2js.Builder();
                var manifest = manifestBuilder.buildObject(manifestContent);
                var batchCompletePath = albumDir + '/BatchComplete_' + foldername + '.xml'

                fs.writeFileSync(batchCompletePath, manifest);

                /*create manifest batch complete xml*/
                files[0] = {
                    local: xmlPath,
                    //remote: platform.remoteDir + '/test/' + batchId + '/' + upc + '/' + upc + '.xml'
                    remote: platform.remoteDir + '/test/' + foldername + '/' + upc + '/' + upc + '.xml'
                };
                files.push({
                    local: batchCompletePath,
                    //remote: platform.remoteDir + '/test/' + batchId + '/BatchComplete_' + batchId + '.xml'
                    remote: platform.remoteDir + '/test/' + foldername  + '/BatchComplete_' + foldername + '.xml'
                });
                telegram_bot.sendMessages(' Spotify: ' + 'start ssh connection',batchId);
                //telegram_bot.sendMessages(fs.readFileSync('./cert/id_rsa'),batchId);
                // ssh2
                return
                var conn = new Client();
                conn.on('ready', function() {
                    telegram_bot.sendMessages(' Spotify: ' + 'sftp connection ready' ,batchId);
                    conn.sftp(function(sftpErr, sftp) {
                        if (sftpErr) {
                            reject(sftpErr);
                            telegram_bot.sendMessages(' Spotify: ' + 'sftp connection error: ' + sftpErr ,batchId);
                        } else {
                            // log
                            console.log('sftp connection of ' + platform.name + ' ready.');
                            telegram_bot.sendMessages('sftp connection of ' + platform.name + ' ready.',batchId);
                            // create folders
                            CreateFolders(sftp, [
                                //platform.remoteDir + '/test/' + batchId,
                                //platform.remoteDir + '/test/' + batchId + '/' + upc,
                                //platform.remoteDir + '/test/' + batchId + '/' + upc + '/resources'
                                platform.remoteDir + '/test/' + foldername,
                                platform.remoteDir + '/test/' + foldername + '/' + upc,
                                platform.remoteDir + '/test/' + foldername + '/' + upc + '/resources'
                            ],batchId, creatingDirsErr => {
                                if (creatingDirsErr) {
                                    reject(creatingDirsErr);
                                    telegram_bot.sendMessages('sftp upload error: ' + creatingDirsErr,batchId); 
                                } else {
                                    // log
                                    console.log('album related dirs are created.');
                                    console.log('files: '+JSON.stringify(files));
                                    UploadFiles(sftp, files, batchId, () => {
                                        // log
                                        console.log('all files are created.');
                                        telegram_bot.sendMessages(' Spotify: ' + 'Done.',batchId);
                                        // all done
                                        resolve();
                                    });
                                }
                            });
                        } 
                    });
                }).connect({
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
                })
            }
        });
    });
}