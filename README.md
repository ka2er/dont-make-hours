dont-make-hours
===============

is a nodejs web server to track work hours at office where we use eTemptation

Configuration
=============

just rename config.json.sample to config.json and edit it.

```
cp config.json.sample ~/.dontmakehours.json
vim ~/.dontmakehours.json
```

Usage
=====

```
node server.js
```

You can now access it via browser http://localhost:9999

Changelog
=========

v0.0.4
 - config file in user directory
 - rules constants are stored in config file

v0.0.3
 - colored hour (green/red)
 - pretty hour formatting
 - handle week with CP

v0.0.2
 - add countdown
 - more verbose error in case of configuration error

v0.0.1
 - initial version
