var request = require('browser-request');
var Q = require('q');
module.exports = function(url){
    var promise = Q.defer();
    request(url, function(err, response, body){
        if(err){
            promise.reject(err);
        } else {
            promise.resolve(body);
        }
    });
    return promise.promise;
};