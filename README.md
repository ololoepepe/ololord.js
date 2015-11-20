Imageboard engine in JavaScript to rule them all.

# Setup

## Geolocation

ololord.js uses IPInfoDB database for geolocation. You have to download the appropriate DB file (in CSV format)
yourself and convert it into SQLite 3 database using the script (```tools/geolocation.js```). The .csv file may be
downloaded here: http://lite.ip2location.com/database-ip-country-region-city (registration is required). After
downloading the file, run: ```tools/geolocation.js <path/to/file.csv>```.

If you use IPv6, you should download an IPv6 version of IPInfoDB database, otherwise IPv4 version should be used.

**Note:** Geolocation is really fast (~5 milliseconds per query).

# API

See: [Wiki](https://github.com/ololoepepe/ololord.js/wiki)
