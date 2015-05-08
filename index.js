var WebTorrent = require('webtorrent');
var promisedRequest = require('./lib/promised-request.js');
var Buffer = require('buffer/').Buffer;
var localforage = require('localforage');
var Q = require('q');
var debug = require('debug');
var log = debug('webtorrentapp');

function extractModuleExports(script){
    return eval.call(window, '(function(module){' + script + ';return module.exports})({})');
}

module.exports = function(config){
    var appFiles = ['package.json', 'index.js'].concat(config.files || []);
    var cacheFiles = ['package.json', 'index.js'].concat(config.cache || []);
    var path = config.path || '';
    var seedTimeoutMs = config.seedTimeout || 5000;
    var appName = config.name || 'Just another WebTorrent app';

    var promisedFiles = {};
    appFiles.forEach(function(file){
        promisedFiles[file] = Q.defer();
    });
    var torrentPromise = Q.defer();

    function downloadTextFile(filename){
        var deferred = Q.defer();
        torrentPromise.promise.then(function(torrent){
            var index;
            for(index in torrent.files){
                var file = torrent.files[index];
                if(file.name == filename){
                    var content = '';
                    var stream = file.createReadStream();
                    stream.on('data', function(data){
                        content += data;
                    });
                    stream.on('end', function(){
                        deferred.resolve(content);
                    });
                    return;
                }
            }
            deferred.reject("File not found");
        });
        return deferred.promise;
    }

    function requestText(filename){
        if(torrentPromise){
            torrentPromise.promise.then(function(){
                downloadTextFile(filename).then(promisedFiles[filename].resolve);
            });
        }
        return promisedFiles[filename].promise;
    }

    function launchApp(script){
        var f = extractModuleExports(script);
        f({
            requestText: requestText
        })
    }

    log("Checking cache");
    localforage.getItem(appName).then(function(cache){
        Object.keys(cache).forEach(function(key){
            promisedFiles[key].resolve(cache[key])
        });
        log("Successfully restored from cache")
    }).catch(log.bind(log, "Restoring from cache failed"));


    function isCacheOutdated(packageJsonPromise){
        var deferred = Q.defer();
        Q.all([localforage.getItem(appName), packageJsonPromise]).then(function(results){
            var currentPackageJson = JSON.parse(results[0]['package.json']);
            var maybeNewerPackageJson = JSON.parse(results[1]);

            deferred.resolve(maybeNewerPackageJson.version > currentPackageJson.version);
        }).fail(function(){
            deferred.resolve(true)
        });
        return deferred.promise;
    }

    function updateCache(filePromises){
        log("Updating cache");
        var cache = {};
        cacheFiles.forEach(function(filename){
            filePromises[filename].then(function(content){
                cache[filename] = content;
            });
        });
        Q.all(cacheFiles.map(function(name){
            return filePromises[name];
        })).then(function(){
            localforage.setItem(appName, cache, function(){
                log('cache updated');
            });
        });
    }


    var client = new WebTorrent();

    function seed(){
        if(config.torrent){
            client.remove(config.torrent);
        }
        torrentPromise = null;
        var fileNames = Object.keys(promisedFiles);
        var totalFiles = 0;
        var downloadedFiles = {};
        fileNames.forEach( function(key){
            downloadedFiles[key] = promisedRequest(path + key)
            downloadedFiles[key].then(function(content){
                totalFiles++;
                log('Downloaded file ' + totalFiles + ' out of ' + appFiles.length, key);
            });
            downloadedFiles[key].then(promisedFiles[key].resolve);

        });
        log('Preparing to seed.');
        isCacheOutdated(downloadedFiles['package.json']).then(function(outdated){
            if(outdated){
                updateCache(downloadedFiles);
            }
        });

        Q.all(fileNames.map(function(name){
            return downloadedFiles[name];
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
    }
    var seedTimeout = setTimeout(function() {
        log('Download timeout expired.');
        seed();
    }, seedTimeoutMs);

    if(config.torrent){
        log('Connecting to the torrent %c%s', 'color:blue', config.torrent);
        client.add(config.torrent, {}, function(torrent){
            clearTimeout(seedTimeout);
            torrentPromise.resolve(torrent);
            log('Connected!');
            isCacheOutdated(downloadTextFile('package.json')).then(function(outdated){
                if(outdated){
                    var downloadedFiles = {};
                    var totalFiles = 0;
                    cacheFiles.forEach( function(filename){
                        downloadedFiles[filename] = downloadTextFile(filename);
                        downloadedFiles[filename].then(function(){
                            totalFiles++;
                            log('Downloaded file ' + totalFiles + ' out of ' + cacheFiles.length, filename);
                        });
                    });
                    updateCache(downloadedFiles);
                }
            });
        });
    } else {
        clearTimeout(seedTimeout);
        log('No torrent provided. Skipping download.');
        seed();
    }

    requestText('index.js').then(launchApp);
};