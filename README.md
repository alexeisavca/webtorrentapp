# Webtorrent App
Webtorrent App allows you to launch web apps(SPAs) from [webtorrents.](https://github.com/feross/webtorrent)

## Why?
1. It allows you to build *insanely* huge apps. Think gigabytes.
2. It decreases the server load, since your users will be downloading the files from other users, not from your server.
3. It's decentralized and, in fact, webtorrent apps can work with no server at all.

## Tutorial
Get webtorrentapp
```
npm install webtorrent
```

Create two files:

1. dev.html
2. client.html

Initialize both with the following code:
```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Document</title>
    <script src="../webtorrentapp.js"></script>
    <script>
        WebtorrentApp({

        })
    </script>
</head>
<body>

</body>
</html>
```

If you wish, you can add a fancy preloader to *client.html:*
```html
<link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap.min.css"/>
```
and
```html
<div class="container">
    <br/>
    <div class="jumbotron">
        <h1>My first webtorrent app</h1>
        <div class="progress">
            <div class="progress-bar progress-bar-striped active" role="progressbar"
                 aria-valuenow="40" aria-valuemin="0" aria-valuemax="100" style="width:100%">
                Loadng...
            </div>
        </div>
    </div>
</div>
```
Now modify *client.html* so that WebtorrentApp call looks like this:
```js
WebtorrentApp({
    path: 'app/',
    restoreFromCache: false //you really don't want cache getting in your way while developing
})
```
Create a subfolder called *app,* and inside it create a file called *index.js.* That'll be the entry point of your app. *index.js* must export a function, that'll take one argument, and let our app just say "Hello, world!" for now, so let's add this to *index.js*:
```js
module.exports = function(wtapi){
    alert("Hello, world!")
}
```

Now open *dev.html* in a browser, keep in mind that you have to access it via localhost, otherwise it won't be able to fetch the files in order to start seeding. Webtorrentapp uses [debug](https://www.npmjs.com/package/debug) for logging, so open up the console and run this:
```js
localStorage.debug = "webtorrent"
```
because the log will output the torrent data that'll you'll need on the client. Refresh the page and you should see an output like this:
```
webtorrentapp Successfully started seeding. Infohash: c56794f957feff43fee1a24c274dc856a06d6fa7 Magnet: magnet:?xt=urn:btih:c56794f957feff43fee1a24c274dc856a06d6fa7&dn=Just+another+WebTorrent+app&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Fopen.demonii.com%3A1337&tr=udp%3A%2F%2Ftracker.webtorrent.io%3A80&tr=wss%3A%2F%2Ftracker.webtorrent.io +33ms
```
The infohash is the unique identifier of your app, it will be different everytime the checksum of your app changes, so basically, after any modification, no matter how small.  
Copy the infohash, we'll need it in a few seconds. Just to verify that your app is seeding, go to [Instant.io](http://instant.io), preferably on another computer or device, and try downloading your app by the infohash. If everything went well, open up *client.html* and modify it like this:
```js
WebtorrentApp({
    torrent: YOUR_TORRENTS_INFOHASH_OR_MAGNET
    cache: ['index.js']
})
```
Now if you open *client.html* in a browser and check the console you should see that the launcher successfully connected to the torrent and launched your app from it. You should be able to copy just *client.html* and *webtorrentapp.js* to another computer or device and still see the "Hello, world!" message, if not, something went wrong.

Now that we're done with helloworlds, let's move on to cooler stuff. Create a new fle *app/template.html* and add some markup to it, for example
```html
<h1>Why hello there, world!</h1>
```
In *dev.html,* add this line
```js
files: ['template.html']
```
to the Webtorrentapp call, so it looks something like this:
```js
WebtorrentApp({
    path: 'app/',
    restoreFromCache: false,
    files: ['template.html']
})
```
Optionally, if you'd like, you can add this setting to *client.html:*
```js
cache: ['template.html']
```
Now we need to modify the *index.js* file, we'll have it read the *template.html* from the torrent and give us its contents, like this:
```js
module.exports = function(wtapi){
    wtapi.requestFile("template.html").then(function(template){
        document.body.innerHTML = template;
    })
}
```
Refresh *dev.html,* copy the new infohash and the replace the old infohash in *client.html,* now, refresh the *client.html* tab in the browser, you should see the "Hello, world!" alert, and that's because it's been cached, so refresh the tab one more time, and this time you should see your template rendered.  
*requestFile* is a function that you'll be using a lot, if you console.log its result you'll see that it actually returns to you a [Node Buffer](https://nodejs.org/api/buffer.html), to be more specific, a [browser version](https://www.npmjs.com/package/buffer) of it, but it can be casted into a string, which is exactly what happenned here.  
Besides *requestFile* there are functions that fetch from the torrent styles, scripts, and node modules, but they are quite similar to the *requestFile* functions, so I'd rather not bore with them, you can find them in the API section, instead, let's display an image from the torrent!  
To do that, add some image to the *app/* subfolder, suppose it's called *image.jpg.* Now in *client.html* add it to the file list:
```js
files: ['template.html', 'image.jpg']
```
in *template.html* add this:
```html
<img id="the-image"/>
```
and in *index.js* this:
```js
wtapi.requestBlobUrl("image.jpg").then(function(url){
    document.getElementById("the-image").src = url;
});
```
Refresh *dev.html* in the browser, copy the infohash, replace the old infohash in *client.html* and, after two refreshes, you should see your image. This uses the blob URL functionality, inspect the <img> element to see what I'm taking about, these are url that "point" to "files" that exist within browser's memory. You can use them almost anywhere, for example, all of this will work:
```html
<link rel="stylesheet" type="text/css" href="blob:http%3A//localhost%3A63342/1c6467aa-f183-4f09-a146-ff5e52b7267a"/>
<script src="blob:http%3A//localhost%3A63342/1c6467aa-f183-4f09-a146-ff5e52b7267a"></script>
<img src="blob:http%3A//localhost%3A63342/1c6467aa-f183-4f09-a146-ff5e52b7267a"/>
<video src="blob:http%3A//localhost%3A63342/1c6467aa-f183-4f09-a146-ff5e52b7267a"/>
<audio src="blob:http%3A//localhost%3A63342/1c6467aa-f183-4f09-a146-ff5e52b7267a"/>
```
Speaking of &lt;audio&gt;, let's make our app play some music! As you've probably figured out, in order to do this, we'd add song.mp3 to the *app/* folder, and to the files list in *dev.html,* and in *index.js* we could write something like this:
```js
wtapi.requestBlobUrl("song.url").then(function(url){
    var audio = document.createElement("audio");
    audio.controls = true;
    audio.src = url;
    document.body.appendChild(audio);
})
```
However, once you've updated the infohash and refreshed *client.html,* you might've noticed that there's a considerable delay between the loading of the app and the time when the audio actually starts playing, that's because webtorrent needs to download the entire file in order to generate its blob, but we can avoid it with streaming!
Add this to *index.js:*
```js
wtapi.requestStream("song.url").then(function(stream){
    var audio = document.createElement("audio");
    audio.controls = true;
    audio.autoplay = true;
    document.body.appendChild(audio);
    stream.pipe(audio);
});
```
the *requestStream* function returns an instance of a subclass of [Node's stream.Readable](https://nodejs.org/api/stream.html#stream_class_stream_readable) and you can use it to stream any types of files. This subclass also implements a pipe functions that allows you to stream not only to other streams, but to &lt;audio&gt; and &lt;video&gt; tags, using the [MediaSource](https://developer.mozilla.org/ro/docs/Web/API/MediaSource) API. Keep in mind that this API is not yet fully supported, for example, it won't work in Firefox, and I had a really hard time looking for a webm file that Chrome would actually accept to stream, so I'd advise you foresee a blob url fallback for piping into &lt;audio&gt; and &lt;video&gt;, because blobs work everytime everywhere. 

## Examples
Check the /example/ folder of this project

## API

## Please read
![Please read](http://lurkmore.so/images/d/d1/Please_Read.jpg)  
If you think this software is worth a buck or two, I'd be gald to have it.  
Please support the caffeine addiction of your humble servant by donating to my PayPal savca.alexei@gmail.com
