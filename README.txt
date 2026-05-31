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
    secrets.json
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
- Clicking the card opens `secret.html?id=secret-##`.
- `data/secrets.json` must be uploaded with the site.

Test phrase examples:

```text
Someone is tracking this.
Someoneistrackingthis
someone-is-tracking-this
You are watching me.
youarewatchingme
```
