module.exports = function(wtapi){
    wtapi.requestFile('template.html').then(function(content){
        document.body.innerHTML = content;
        document.getElementById('load-text').addEventListener('click', function(){
            wtapi.requestFile('lipsum.txt').then(function(content){
                document.getElementById('the-text').innerHTML = content;
            })
        });
        document.getElementById('load-image').addEventListener('click', function(){
            wtapi.requestBlobUrl('example_image.png').then(function(url){
                document.getElementById('the-image').src = url;
            })
        });
    });
};