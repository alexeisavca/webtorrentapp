# Webtorrent App
## What?
Webtorrent App is a launcher that allows you to launch web apps(SPAs) from [webtorrents](https://github.com/feross/webtorrent)
(with fallback on XHR and in-browser cache). 
It does for web apps what bootloaders do for operating systems and it's kinda like [Project Maelstrom](http://project-maelstrom.bittorrent.com/) except you don't actually need a plugin or a special
web browser in order to launch the app. Any regular browser will do.

## Wait, what? Why?
Lots of reasons:

1. First of all, it will allow to build insanely huge webapps, like *insanely* huge, think of a 1Gb, 2Gb, 10Gb webapp, a Photoshop for browsers,
or an online video editor for browsers, or a 3DMax for browsers, that kinda stuff, and it will also allow you to launch that app
in the matter of seconds on the first launch and almost instantly on subsequent launches.  
2. Server load. Frankly, if you're crazy enough, you could build a several Gb SPA right now, given you'll design it properly and
lazy load everything smartly, however, you'd have to be a millionaire in order to afford a server to power that monstrosity.
Actually, forget about enormous apps, suppose you wanna build a regular SPA, a several megs large SPA, but you wanna distribute
it to a large auditory, think millions of people, now you'd had to sell a kidney in order to afford that kinda server, but you
don't anymore. With Webtorrent App you can release your product with a dirt cheap server, and just not worry about how large
your audience is at all, in fact, the larger the audience, the better your app will perform and the less load there will be on the server!  
3. Actually, you know what, forget a about the server. Here another reason for you: it's distributed. You don't actually need a server
in order to ship your app. You can send your users a .zip with index.html and webtorrentapp.js inside via email and what not, just
seed your app via [Instant.io](http://instant.io) or something, keep the tab open until the swarm gets big enough and it's done.
It's perfect for things like mobile apps or [nw](http://nwjs.io/) desktop apps that don't actually require the user to type in an
address in their browser.
4. Survivability. Are you planning on writing something that can upset certain types of peoples, say, digital rights people or politicians?
Is DDOS and confiscation of servers a plausible possibility? Well look no further, cause with Webtorrent App they can DDOS and 
sequester your servers all they want, it's not gonna do any harm to the spreading of your app, much like with Bittorrent, once the
fire has escaped into the wild there's no putting it out without a martial law.
5. And last but not least: the speed. Forget about trying to squeeze every millisecond out of the loading time, torrents are fast,
and with in browser cache they are even faster(by the way, you're in charge of what gets cached and what does not).
Did you download any torrent lately? Was that fast? Exactly.
