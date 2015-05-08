var Q = require('q');
var Buffer = require('buffer/').Buffer;
function toBuffer(ab) {
    var buffer = new Buffer(ab.byteLength);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
    }
    return buffer;
}
module.exports = function(url){
    var promise = Q.defer();
    var xhr = new XMLHttpRequest();
    xhr.open( "GET", url, true );

    xhr.responseType = 'arraybuffer';

    xhr.onload = function( e ) {
        if(200 == this.status){
            promise.resolve(toBuffer(this.response));
        } else {
            promise.reject("Error: " + this.status);
        }
    };

    xhr.send();
    return promise.promise;
};