var WebTorrent = require('webtorrent');
var promisedRequest = require('./lib/promised-request.js');
var Buffer = require('buffer/').Buffer;
var localforage = require('localforage');
var Q = require('q');
var debug = require('debug');
var log = debug('webtorrentapp');
function launchApp(wtfapi, script){
    var f = eval(script);
    f(wtfapi)
}

module.exports = function(config){
    var useCache = "boolean" === typeof config.cache ? config.cache : true;
    var appFiles = ['version.txt', 'index.js'].concat(config.files || []);
    var webpath = config.webpath || '';
    var seedTimeoutMs = config.seedTimeout || 5000;
    var appName = config.name || 'Just another WebTorretn app';

    var promisedFiles = {};
    appFiles.forEach(function(file){
        promisedFiles[file] = Q.defer();
    });

    function requestText(filename){
        return promisedFiles[filename].promise;
    }

    function requestScript(filename){

    }

    requestText('index.js').then(launchApp.bind(null, {
        requestText: requestText
    }));

    if(useCache){
        log("Checking cache");
        localforage.getItem('webtorrentapp', function(err, cache){
            if(!err && 'object' == typeof cache && cache){
                Object.keys(cache).forEach(function(key){
                    promisedFiles[key].resolve(cache[key])
                });
                log("Successfully restored from cache")
            } else {
                log("Restoring from cache failed")
            }
        });
    }

    /*
     if cache exists
        launch app
        if cache is outdated
           download app
           update cache
        endif
     else if download successful
        save to cache
        launch app
     else if can seed app
        save to cache
        launch app
     endif
     */

    var client = new WebTorrent();
    var seedTimeout = setTimeout(function(){
        log('Download timeout expired. Preparing to seed.');
        var fileNames = Object.keys(promisedFiles);
        var totalFiles = 0;
        fileNames.forEach( function(key){
            promisedFiles[key].resolve(promisedRequest(webpath + key));
            promisedFiles[key].promise.then(function(){
                totalFiles++;
                log('Downloaded file ' + totalFiles + ' out of ' + appFiles.length, key);
            })
        });

        Q.all(fileNames.map(function(key){
            return promisedFiles[key].promise;
        })).then(function(files){
            log('All files have been downloaded. Attempting to seed.');
            try{
                client.seed( files.map(function(body, index){
                    var buffer = new Buffer(body);
                    buffer.name = fileNames[index];
                    return buffer;
                }), {
                    name: appName
                }, function(torrent){
                    log('Successfully started seeding. Infohash: %c%s %cMagnet: %c%s', 'color: blue', torrent.infoHash, 'color:black', 'color:blue', torrent.magnetURI);
                });
            }catch(e){
                log('Oops!', e);
            }
        });



        //Q.all([
        //        promisedRequest(webpath + 'version.txt'),
        //        promisedRequest(webpath + 'index.js')
        //    ].concat( appFiles.map(function(file){ return promisedRequest(webpath + file) }))
        //).then(function(){
        //    console.log(arguments);
        //});
        if(config.torrentId){
            client.remove(torrentId);
        }
        //promisedRequest(webpath + 'index.js').then(launchApp).fail(function(err){
        //    console.log(err);
        //});
        //request('../euterpe/index.js', function(err, response, body){
        //    var indexjs = new Buffer(body);
        //    client.seed(indexjs, { name: 'Euterpe' }, function(torrent){
        //        console.log(torrent.files)
        //        document.getElementById('status').innerHTML = 'Seeding!';
        //        console.log('Seeding started!', torrent.infoHash);
        //        launchEuterpeTorrent(torrent);
        //    });
        //});
    }, seedTimeoutMs);
};