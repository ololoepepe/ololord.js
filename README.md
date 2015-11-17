# ololord.js

Imageboard engine in JavaScript to rule them all.

## API

### Shortcuts

* ```<bn>``` -- board name
* ```<pn>``` -- post number
* ```<tn>``` -- thread number
* ```<fn>``` -- file name

### Pages and threads

* JSON representation of a page: ```/<bn>/<pnr>.json``` (pageNumber from 0 to N)
* JSON representation of a thread: ```/<bn>/res/<tn>.json```
* JSON representation of a catalog: ```/<bn>/catalog.json```

### Static data

This kind of data is guaranteed to not change until the server is restarted. You may cache it.

* Base information (date format, supported captcha engines, etc.): ```/misc/base.json```
* Array of objects describing all available boards: ```/misc/boards.json```
* Description of a specific board ```/misc/board/<boardName>.json```
* UI translations: ```/misc/tr.json```
* List fo all available template partials: ```/misc/partisls.json```

### Dynamic data

This kind of data may (and probabli will) change dynamically. You should NOT cache it.

* List of posts: ```/api/posts.json?posts=<bn1>:<pn1>[&posts=<bn2>:<pn2>[...]]```
* One specific post: ```/api/post.json?boardName=<bn>&postNumber=<pn>```
* One specific thread (no posts): ```/api/threadInfo.json?boardName=<bn>&threadNumber=<tn>```
* Information about a list of files: ```/api/fileInfos.json?fileNames=<fn1>[&fileNames=<fn2>[...]]```
* or ```/api/fileInfos.json?fileHashes=<hash1>[&fileNames=<hash2>[...]]```
* Information about a specific file: ```/api/fileInfos.json?fileName=<fn>```
* or: ```/api/fileInfos.json?fileHash=<hash>```
* Last N posts of a thread: ```/api/lastPosts.json?boardName=<bn>&threadNumber=<tn>[&lastPostNumber=<pn>]```
* Last N posts of each thread: ```/api/lastPosts.json?threads=<bn1>:<tn1>[:<pn1>][&threads=<bn2>:<tn2>[:<pn2>][...]]```
* Last post numbers on each board: ```/api/lastPostNumber.json?boardNames=<bn1>[&boardNames=<bn2>[...]]```
* Last post numbers on a specific board: ```/api/lastPostNumbers.json?boardName=bn```
* Captcha quota (posts left without captcha) on a specific board: ```/api/captchaQuota.json?boardName=<bn>```
* Banned user information: ```/api/bannedUser.json?userIp=<ip>```
* Banned users information: ```/api/bannedUsers.json?users=<ip1>[&users=<ip2>[...]]```
* Coub video metadata (Coub disallows CORS): ```/api/coubVideoInfo.json?videoId=<id>```
* File headers (result of a HEAD request): ```/api/fileHeaders?url=<url>```

### POST requests

Body must be ```multipart/form-data```-encoded.

On error an error page (ascetic mode) or an error object (normal mode) is returned.

#### Login

Path: ```/action/login```

Fields:

* ```hashpass``` -- password or hash

Effect: sets ```hashpass``` cookie.

Result: redirects to the source page.

#### Logout

Path: ```/action/logout```

Effect: deletes ```hashpass``` cookie.

Result: redirects to the source page.

#### Redirect

Path: ```/action/redirect```

Fields:

* ```url``` -- the url to redirect to

Result: redirects to the page specified.
