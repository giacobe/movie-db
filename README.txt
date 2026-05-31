# Movie Database Website with Hidden Secret Phrases

Upload the contents of this folder to your web server as the `movie-db` directory.

Expected layout:

```text
movie-db/
  index.html
  movie.html
  secret.html
  css/
    movie-db.css
  js/
    movie-db.js
    movie-detail.js
    secret-detail.js
  data/
    movies.json
    secret-entries/
      [hashed-lookup].json
  images/
    posters/
      10428_Hackers.jpg
      201088_Blackhat.jpg
      ...
```

Changes in this version:

- The visible "Secret phrase check" section has been removed.
- Secret phrase detection is hidden inside the normal movie search box.
- Matching ignores spaces, punctuation, and capitalization.
- A matching phrase creates a normal-looking secret result card.
- Clicking the card opens `secret.html?key=[hashed lookup]`.
- The index page does not download a full list of secret phrases or secret messages.
- `data/secrets.json` has been removed.

Incremental search tracing update
---------------------------------
The search page now updates the browser URL as the user types. For example,
typing Star will show this sequence in the address bar:

  index.html?q=s
  index.html?q=st
  index.html?q=sta
  index.html?q=star

Each search interaction also performs a fresh GET request against the static
movie JSON file using the same query string. This is intentional so browser
developer tools, packet captures, and web server logs show requests such as:

  GET /data/movies.json?q=s
  GET /data/movies.json?q=st
  GET /data/movies.json?q=sta
  GET /data/movies.json?q=star

When a user selects a movie card, the detail URL includes the selected title,
for example:

  movie.html?id=...&q=star&selected=Star+Wars


Secret-entry handling update:
- The index page no longer downloads data/secrets.json. That file has been removed.
- Secret entries are split into one JSON file per hidden entry under data/secret-entries/.
- The filename is the SHA-256 hash of the normalized phrase, so the browser can test the currently typed phrase without receiving a full list of valid phrases.
- The secret detail page loads only the one matching secret-entry JSON file identified by the lookup key in the URL.
- For Apache/Nginx use, keep directory browsing disabled so the directory contents are not listed.
