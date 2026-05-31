# Movie Poster Local Downloader

This corrected version downloads the images and writes local paths into the CSV.

Run:

```bash
python update_movie_posters_local.py movies.csv movies_with_posters.csv --overwrite
```

Default image folder:

```text
images/posters/
```

Example CSV image value after this script runs:

```text
images/posters/603_The_Matrix.jpg
```

Use `--overwrite` to force it to redownload posters and replace any existing remote TMDb URLs in the CSV.
