var WebTorrent = require('webtorrent');
var promisedRequest = require('./lib/promised-request.js');
var Buffer = require('buffer/').Buffer;
var localforage = require('localforage');
var Q = require('q');
var debug = require('debug');
var log = debug('webtorrentapp');
var FileStream = require('webtorrent/lib/file-stream');
var ReadableStream = require('stream').Readable;

function extractModuleExports(script){
    return eval.call(window, '(function(module){' + script + ';return module.exports})({})');
}

module.exports = function(config){
    var appFiles = ['index.js'].concat(config.files || []);
    var cacheFiles = config.cache;
    var path = config.path || '';
    var seedTimeoutMs = config.seedTimeout || 5000;
    var appName = config.name || 'Just another WebTorrent app';
    var restoreFromCache = "boolean" == typeof config.restoreFromCache ? config.restoreFromCache : true;

    var promisedFiles = {};
    appFiles.forEach(function(file){
        promisedFiles[file] = Q.defer();
    });
    var torrentPromise = Q.defer();

    function findFileInTorrent(filename, torrent){
        var index;
        for(index in torrent.files){
            var file = torrent.files[index];
            if(file.name == filename){
                return file;
            }
        }
    }

    function requestFile(filename){
        if(torrentPromise){
            torrentPromise.promise.then(function(torrent){
                findFileInTorrent(filename, torrent).getBuffer(function(err, buffer){
                    promisedFiles[filename].resolve(buffer);
                });
            });
        }
        return promisedFiles[filename].promise;
    }

    function requestBlobUrl(filename){
        var promise = Q.defer();
        requestFile(filename).then(function(buffer){
            promise.resolve(URL.createObjectURL(new Blob([buffer])));
        });
        return promise.promise;
    }

    function requestStream(filename){
        var promise = Q.defer();
        if(torrentPromise){
            torrentPromise.promise.then(function(torrent){
                promise.resolve(findFileInTorrent(filename, torrent).createReadStream())
            })
        }
        requestFile(filename).then(function(file){
            var stream = ReadableStream();
            stream.push(file);
            stream.push(null);
            stream.pipe = FileStream.prototype.pipe.bind(stream);
            promise.resolve(stream);
        });
        return promise.promise;
    }

    function requestExternalStyle(url){
        var ss = document.createElement("link");
        ss.type = "text/css";
        ss.rel = "stylesheet";
        ss.href = url;
        document.head.appendChild(ss);
    }

    function requestExternalScript(url){
        var ss = document.createElement("script");
        ss.src = url;
        document.head.appendChild(ss);
    }

    function requestStyle(filename){
        return requestBlobUrl(filename).then(requestExternalStyle);
    }

    function requestScript(filename){
        return requestBlobUrl(filename).then(requestExternalScript);
    }

    function requestModule(filename){
        return requestFile(filename).then(extractModuleExports);
    }

    function launchApp(script){
        var f = extractModuleExports(script);
        f({
            requestFile: requestFile,
            requestBlobUrl: requestBlobUrl,
            requestStream: requestStream,
            requestExternalStyle: requestExternalStyle,
            requestExternalScript: requestExternalScript,
            requestStyle: requestStyle,
            requestScript: requestScript,
            requestModule: requestModule
        })
    }

    if(restoreFromCache){
        log("Checking cache");
        localforage.getItem(appName).then(function(cache){
            Object.keys(cache.files).forEach(function(filename){
                promisedFiles[filename].resolve(new Buffer(cache.files[filename]))
            });
            log("Successfully restored from cache")
        }).catch(log.bind(log, "Restoring from cache failed"));
    } else {
        log("Restoring from cache disabled by developer. Skipping");
    }


    function isCacheOutdated(torrentId){
        var deferred = Q.defer();
        localforage.getItem(appName).then(function(cache){
            deferred.resolve(cache.torrentId != torrentId);
        }).catch(function(){
            deferred.resolve(true)
        });
        return deferred.promise;
    }

    function updateCache(filePromises, torrentId){
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
            localforage.setItem(appName, {
                torrentId: torrentId,
                files: cache
            }, function(){
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
            downloadedFiles[key].then(function(){
                totalFiles++;
                log('Downloaded file ' + totalFiles + ' out of ' + appFiles.length, key);
            });
            downloadedFiles[key].then(promisedFiles[key].resolve);

        });
        log('Preparing to seed.');

        Q.all(fileNames.map(function(name){
            return downloadedFiles[name];
        })).then(function(files){
            log('All files have been downloaded. Attempting to seed.');
            try{
                client.seed( files.map(function(body, index){
                    var buffer = body;
                    buffer.name = fileNames[index];
                    return buffer;
                }), {
                    name: appName
                }, function(torrent){
                    log('Successfully started seeding. Infohash: %c%s %cMagnet: %c%s', 'color: blue', torrent.infoHash, 'color:black', 'color:blue', torrent.magnetURI);
                    isCacheOutdated(torrent.infoHash).then(function(outdated){
                        if(outdated){
                            updateCache(downloadedFiles, torrent.infoHash);
                        }
                    });
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
            if(torrentPromise){
                torrentPromise.resolve(torrent);
            } else {
                return;
            }
            log('Connected!');
            isCacheOutdated(torrent.infoHash).then(function(outdated){
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
                    updateCache(downloadedFiles, torrent.infoHash);
                }
            });
        });
    } else {
        clearTimeout(seedTimeout);
        log('No torrent provided. Skipping download.');
        seed();
    }

    requestFile('index.js').then(launchApp);
};