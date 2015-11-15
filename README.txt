===============================================================================
 ololord.js
===============================================================================

Homepage: https://github.com/ololoepepe/ololord.js

Author: Andrey Bogdanov (ololoepepe@gmail.com)

License: MIT (see LICENSE.txt)

Imageboard engine in JavaScript to rule them all.

==============================================================================
 Overview
==============================================================================



==============================================================================
 Dependencies
==============================================================================

ololord.js uses IPInfoDB database for geolocation. You have to download the
appropriate DB file (in CSV format) yourself and convert it into SQLite 3
database using the script (tools/geolocation.js). The .csv file may be
downloaded here: http://lite.ip2location.com/database-ip-country-region-city
(registration is required). After downloading the file, run:
tools/geolocation.js <path/to/file.csv>
Note: Geolocation is really fast (~5 milliseconds per query).

==============================================================================
 FAQ
==============================================================================

Q: What are ololord.js license restrictions?
A: There are almost no restrictions. You may use ololord.js as you wish, but
don't forget that this statement doesn't apply to the libraries used by it.
See: LICENSE.txt for details.

Q: I'm having troubles using ololord.js, where can I get help?
A: E-mail/Jabber: ololoepepe@gmail.com

Q: I've detected a bug/I have an idea, where can I report/post it?
A: See the answer above.
