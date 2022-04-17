const express       = require('express');
const bodyParser    = require('body-parser');
const helmet        = require('helmet');
const request       = require('request');
const https         = require('https');
const fs            = require('fs');
const promise       = require('promise');
const cmd           = require('node-cmd');
const aws           = require('aws-sdk');
const sendgrid      = require('sendgrid');
const rs            = require('randomstring');
const xml2js        = require('xml2js');
const moment        = require('moment');
const zip           = require('zip-folder');
const ncp           = require('ncp').ncp;


var Client          = require('ssh2').Client;
const constant      = require('./constant/targetFolder.js')
const telegram_bot  = require('./util/telegramBot.js')
//pending -> live
const ID = '';
const CONF = {

    encryptionKey   : 'Nqk3fS4ctwTF7EYMoArVbgykKleKeIkW',
    OCS             : {
        endpoint            : `https://api.oneshop.cloud`,//!/^local$/i.test(process.env.MODE || 'local') ? `https://api.oneshop.cloud` : `http://ec2-13-251-89-201.ap-southeast-1.compute.amazonaws.com`,
        token               : {
            id  : 'rOwn1DzwvDdIaq785WLKqntaEfI0xFP6',   // 5 or 9wjB9wJh0T45Y20HftCEQNrkXGIIO1aJ 
                                                        // or rOwn1DzwvDdIaq785WLKqntaEfI0xFP6(yeungpete) 
                                                        // or ueC9SIrhJLtizHvWKtYjdMpH8lOB8pjf(Infogoomusic)
                                                        // or ml6pXZIGmWCzduhDvaVQUAHfPryLIL96(jacqueline.liu)
                                                        // or lkAkCJnEJ51owG7WPpqURhKrkt9LCTV3(kuriousgrocery)
            key : 'Nv3MnR57fCrJsq2J8mhGxcyEeeCZBpQL'
        }
    },
    S3              : {
        accessKeyId         : `AKIAI3MQOTFJ6MZ53O6A`,
        secretAccessKey     : `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`,  
        region              : `ap-southeast-1`
    }
};
//

const ADMINS = [
    'lucas@twentytwomusic.com',
    'inbox@lucasfong.com',
    !/^local$/i.test(process.env.MODE || 'local') ? 'pete@twentytwomusic.com' : null,
    !/^local$/i.test(process.env.MODE || 'local') ? 'hin_613@hotmail.com' : null
].filter(a => a);

// create a proxy
const s3 = new aws.S3(CONF.S3);

// -------------- helpers -------------- //
var download = function(url, dest, cb) {
    var file = fs.createWriteStream(dest);
    https.get(url, source => {
        source.pipe(file);
        file.on('finish', () => file.close(() => cb && cb()));
    });
};

// -------------- /helpers -------------- //

// create app engine
const app = express();
// security settings
app.use(helmet());
// parse form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// set routes
app.route('/healthcheck').get((req, res) => res.status(200).end('No problem.'));
app.route('/release').post((req, res) => {
   
    // for xml generation
    const TerritoryCode = require('./util/TerritoryCode.json');

    // get id
    var sourceId = req.body.feed || req.query.feed || ID;
    var isTakeDown = req.body.isTakeDown || req.query.isTakeDown || false;
    // create batch id
    var batchId = rs.generate({
        length  : 12,
        charset : 'numeric'
    });
    batchId = Date.now().toString();
    telegram_bot.sendMessages('start || istakeDown:'+isTakeDown,batchId);
    /*
    var batchId = moment().format("YYYY")c + (function padding1(num, length) {
        for(var len = (num + "").length; len < length; len = num.length) { num = "0" + num; } return num;
    })(parseInt(sourceId), 8);
    */

    // setup process data container
    var data = {};
    // list of files to upload to platforms
    var files = [];
    var kkboxfoldername = '';

    // sample ddex xml
    files.push({
      name: batchId + '.xml',
      path: './sample/ddex.xml'
    });
    var xmlWrapper = {};
    var xmlWrapperAllPlatform = {}

    // setup directory
    var dir = './tmp/' + sourceId;

    if(!fs.existsSync('./tmp')){
        fs.mkdirSync('./tmp')
    }
    
    // ----------------- setup tmp env ----------------- //
    new promise((resolve, reject) => {
        telegram_bot.sendMessages('Create tmp folders',batchId);
        console.log('----------Create tmp folders----------');
        // create root dir
        [
            '',
            '/batch_' + batchId,
            '/batch_' + batchId + '/' + batchId,
            '/batch_' + batchId + '/' + batchId + '/resources'
        ].forEach(path => !fs.existsSync(dir + path) && fs.mkdirSync(dir + path));
        // log
        console.log('folder for album:' + sourceId + ' created.');
        telegram_bot.sendMessages('folder for album:' + sourceId + ' created.',batchId);
        // create folder
        resolve();
    })
    // ----------------- /setup tmp env ----------------- //
    // ----------------- get source info ----------------- //
    .then(() => new promise((resolve, reject) => request({
        method: 'GET',
        url: CONF.OCS.endpoint + '/feeds?ids=' + sourceId,
        auth: {
            user: CONF.OCS.token.id,
            pass: CONF.OCS.token.key
        }
    }, (error, response, body) => {
        telegram_bot.sendMessages('Get album data from OCS',batchId);
        console.log('----------Get album data from OCS----------');
        //console.log(response);
        //console.log(body);
        // parse result
        let result = null;
        let album = {};
        try {result = JSON.parse(body)} catch(e) {result = null}

        telegram_bot.sendMessages('Got ' + (((result || {}).data).rows || []).length + ' album(s).',batchId);
        telegram_bot.sendMessages('info: ' + JSON.stringify((((result || {}).data).rows || [])),batchId);

        // parse album info
        if ((((result || {}).data).rows || []).length > 0) {
          // console.log('enter album info');
            album['id']=result.data.rows[0].id;
            album['createdTime']=album['updatedTime']=album['publishTime']=result.data.rows[0].updated_time;
            (((((result || {}).data || {}).rows || []).shift() || {}).sections || []).forEach(section => {
                let info = section.description;

                // console.log(`${section.title}:`,/^Track-[1-9][0-9]|Track-[0-9]$/i.test(section.title));
                if (/^Track-[1-9][0-9]|Track-[0-9]$/i.test(section.title)) {
                    try {info = JSON.parse(section.description)} catch(e) {info = {}}
                    // got valid info
                    if (Object.keys(info).length > 0) {
                        const index = section.title.split('-').pop();
                        album.tracks = album.tracks || [];
                        album.tracks[index] = info;

                        // console.log('index:',index);

                        for (var key in album.tracks[index]) {
                          //console.log('album key:'+key);
                        switch(key){
                            case "artists":
                            case "composers":
                            case "lyrists":
                            case "arrangers":
                            case "producers":
                            let people = album.tracks[index][key].split(',\n');
                            let arr = [];
                            people.forEach(p => {
                                let personInfo = p.split(',');
                                let person = {key: personInfo[0], name: personInfo[1], type: personInfo[2]}
                                arr.push(person);
                            })
                            album.tracks[index][key]=arr;
                            break;
                            default:
                        }
                        }
                        //console.log("section media url:"+section.media[0]);
                        if ((section.media || []).length > 0) album.tracks[index].src = section.media[0];

                    }
                } else {
                    album[section.title] = info;
                    //console.log('info:'+info);
                    if (/^(selectedStores|selectedRegions)$/i.test(section.title) && album[section.title] !=null){
                      album[section.title] = album[section.title] || '';
                      album[section.title] = info.split(',');
                      for (var i in album[section.title]){
                          Object.keys(TerritoryCode).forEach(function(key) {
                              if (key == album[section.title][i]) album[section.title][i] = TerritoryCode[key];
                          })
                      }
                    }
                    if (/^artists$/i.test(section.title) && info != null){
                    album[section.title] = []
                    //console.log(info);
                let artists = info.split(',\n');
                    artists.forEach(a => {
                        let artistsInfo = a.split(',');
                        let artist = {key: artistsInfo[0], name: artistsInfo[1], type: artistsInfo[2]}
                        album[section.title].push(artist)
                    })
                    }
                    if (/^preReleaseDates$/i.test(section.title)){
                    if (album[section.title] !== null) {
                      //console.log('album title:'+album[section.title]);
                        let items = album[section.title].split(',');
                        album[section.title] = {}
                        items.forEach(item => {
                        let platformInfo = item.split(':');
                        album[section.title][platformInfo[0]] = platformInfo[1]
                        })
                    }
                    }
                    if ((section.media || []).length > 0 && /^artworkSrc$/i.test(section.title)) album[section.title] = section.media[0];

                    //get record folder for kkbox sftp
                    if (/^recordLabel$/i.test(section.title)){
                        // console.log('get record label');
                        request({
                            method: 'GET', 
                            url: CONF.OCS.endpoint + '/feeds?ids=' + section.description,
                            auth: {
                                user: CONF.OCS.token.id,
                                pass: CONF.OCS.token.key
                            }
                        }, (error, response, body) =>{
                            if (!error && JSON.parse(body).data.rows.length > 0){
                                // console.log(JSON.parse(body));
                                const result = JSON.parse(body).data.rows.shift();
                                const recordCompany = result.sections.shift().description;
                                // console.log('recordCompany:',recordCompany);
                                kkboxfoldername = constant.recordlabelToFolderMapping[recordCompany.toString()];
                            }else{
                                // console.log('error',error);
                                res.status(404).end(error);
                            } 
                        })
                    }
                }
            });
        }
        // got album
        if (Object.keys(album).length < 1) {
            reject({
                code: 400,
                messages: [(error || {}).message || 'No album data found.']
            });
        } else if (!/^pending$/i.test(album.status || '')) {
            //console.log(album);
            //console.log(album.status);
            reject({
                code: 400,
                messages: ['Incomplete album.']
            });
        } else {
            // save album info
            data.album = album;
            console.log('data.album');
            console.log(data.album);
            // next process 
            resolve();
        }

    })))
    // ----------------- /get source info ----------------- //
    // got info, gen ddex xml for each track
    .then(() => new promise((resolve, reject) => {

        console.log('----------Download album data from OCS----------');
        // console.log('data.album.artworkSrc:'+data.album.artworkSrc);
        telegram_bot.sendMessages('artworkSrc:'+data.album.artworkSrc.split('/').pop(),batchId);
        //data.album.artworkSrc = ['test','test22'];
        const sources = Object.assign({}, {
            artwork:
            {
              src: data.album.artworkSrc
            }
        }, data.album.tracks);
        // get tracks
        const sourceNames = Object.keys(sources);
        let upcCode = data.album.upcCode || '1234567890';
        console.log('source names:',sourceNames);
        // extract track info
        if (!sourceNames.length) {
            // next process
            resolve();
        } else {
            (function extract(i) {
                // get info
                var source = sources[sourceNames[i]];

                // all done
                if (!source) {
                    // next process
                    resolve();
                } else { 
                    // get source extension
                    //console.log('source:'+JSON.stringify(source));
                    const ext =  source.src == null ? '':source.src.split('.').pop();
                    // set media name
                    const name = upcCode + (isNaN(parseInt(sourceNames[i])) ? '' : '_' + sourceNames[i]) + '.' + ext;
                    // set path
                    var path = dir + '/batch_' + batchId + '/' + batchId + '/resources/' + name;
                    // download track's sources
                    source.src = source.src || '';
                    console.log('source.src:'+JSON.stringify(source.src));

                    source.src.length > 0 ? download(source.src, path, () => {
                    console.log('file - ' + path + ' has been downloaded.');
                    telegram_bot.sendMessages('file(' + (i + 1) + '/' + sourceNames.length + ') - ' + path.split('/').pop() + ' has been downloaded.',batchId);
                        files.push({
                            name: name, 
                            path: path
                        });
                        // next track
                        extract(++i);
                    }) : extract(++i);
                    
                }
            })(0);
        }
    }))
    .then(() => new promise((resolve, reject) => {
      console.log('----------prepare ddex xml----------');
   
      const selectedPlatforms = data.album.selectedStores;
      var targetPlatform = '';
    //   console.log(selectedPlatforms);
      telegram_bot.sendMessages('preparing ddex xml: ' + selectedPlatforms.join(',') + '.', batchId);

      try {
        selectedPlatforms.forEach(platform => {
          targetPlatform = platform;
          xmlWrapperAllPlatform[targetPlatform] = xmlWrapper = require(`./generators/${targetPlatform}.js`)(targetPlatform, data, batchId, isTakeDown);
        });
      } catch(e) {
        telegram_bot.sendMessages(JSON.stringify(e.stack, null, 4), batchId);
      }
      
     //   xmlWrapper = require(`./generators/${targetPlatform}.js`)(targetPlatform, data, batchId, isTakeDown);
     console.log(xmlWrapperAllPlatform)
      
      // var builder = new xml2js.Builder();
      // var xml = builder.buildObject(Wrapper);
      //
      // fs.writeFileSync(dir + '/batch_' + batchId + '/' + batchId + '/' + batchId + '.xml', xml);
      resolve();
    }))
    // send tracks to platforms
    .then(() => {
        console.log('----------Upload files to platforms----------');        
        //console.log(JSON.stringify(xmlWrapper));
        telegram_bot.sendMessages('Uploading files to platforms', batchId);
        let label   = data.album.copyrightHolder;
        let upcCode = data.album.upcCode || '1234567890';
        kkboxfoldername = 'TT';

        telegram_bot.sendMessages('kkbox folder name: '+kkboxfoldername, batchId);

        // console.log('kkboxfoldername',kkboxfoldername);
        // set platforms
        var platforms = [
          {
            id        : 'PADPIDA2010093001B',
            name      : 'KKBOX Taiwan Co. Ltd.',
            alias     : 'kkbox',
            approach  : 'ftp',
            host      : 'twentytwo.sftp-labels.kkbox.com.tw',
            username  : 'twentytwo',
            port      : 22,
            //remoteDir : `./upload/tt_goomusic`,
            remoteDir : `./upload/tt`,
            contacts  : []//['wesleyching@kkbox.com','irisszeto@kkbox.com','paintingng@kkbox.com'] // emails
          },
          {
            id        : '',
            name      : 'MOOV',
            alias     : 'moov',
            approach  : 'ftp',
            host      : '219.76.111.65',
            username  : 'twentytwo',
            password  : 'Syf?9RG8',
            port      : 2222,
            remoteDir : '.',
            contacts  : []//['kenny.lk.wong@pccw.com','Jason.CH.Mak@pccw.com','Ben.KS.Ho@pccw.com'] // emails
          },
          {
            id        : '1111111111111', // to be get from joox partner id
            name      : 'Joox',
            alias     : 'joox',
            approach  : 'ftp',
            host      : '119.28.4.159',
            username  : 'HK_TwentyTwo',
            port      : 65100,
            remoteDir : '.',
            contacts  : []
          },
          {
            id        : '',
            name      : 'Rockmobile',
            alias     : 'itunes',
            approach  : 'email',
            /*
            host      : '219.76.111.65',
            username  : 'twentytwo',
            password  : 'Syf?9RG8',
            port      : 2222,
            remoteDir : '.',
            //*/
            contacts  : [] // emails
          },
          {
            id        : 'PADPIDA2011072101T',
            name      : 'Spotify',
            alias     : 'spotify',
            approach  : 'ftp',
            host      : 'content-delivery.spotify.com',
            username  : 'ext-twentytwo',
            port      : 22,
            remoteDir : './twentytwo',
            complete  : "BatchComplete_" + batchId + ".xml",
            contacts  : [] // emails
          }
        ];
        // telegram_bot.sendMessages('platforms'+JSON.stringify(platforms), batchId);
        // const selectedPlatforms = ((data.album.selectedStores || {}).info || '').split(/ *, */).map(p => p.toLowerCase());
        const selectedPlatforms = data.album.selectedStores;
        telegram_bot.sendMessages('selected Platforms: '+selectedPlatforms, batchId);
        return promise.all(platforms.filter(platform => selectedPlatforms.indexOf(platform.alias) >= 0).map((platform, pfI) => require('./uploaders/' + platform.alias + '.js')(
          platform,
          dir,
          batchId,
          upcCode,
          //JSON.parse(JSON.stringify(xmlWrapper)),
          JSON.parse(JSON.stringify(xmlWrapperAllPlatform[platform.alias])),
          JSON.parse(JSON.stringify(files))
        )));
        
    })
    .then(() => new promise((resolve, reject) => {
        console.log('----------Delete tmp dir----------');
        cmd.get('rm -rf ' + dir, delTmpErr => {
            if (delTmpErr) console.log(delTmpErr);

            telegram_bot.sendMessages('sftp upload success', batchId);
            console.log('done.');
            res.end('done.');
        });
    }))
    .catch(error => {
        console.log(error);
        res.status(error.code || 400).end(error.messages.join("\n"));
    });
});

var port    = process.env.PORT || 3791;
var server  = app.listen(port, () => console.log(`app listening on port ${port}.`));
server.timeout = 2400000;

/*
var express = require('express');
var port = process.env.PORT || 3000;
var app = express();

app.get('/', function(req, res) {
  res.send({
    "Output" : "Hello World!"
  });
});

app.post('/', function(req, res) {
  res.send({
    "Output" : "Hello World!"
  });
});

app.listen(port);
module.exports = app;
*/