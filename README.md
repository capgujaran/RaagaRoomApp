# Raaga Room

A portrait-friendly music and lyrics app with a home page, playlist, and manually scrollable lyrics.

## Listen and sing

Open the home page, choose **Let's sing**, and select a song. Press **Play** to start the music. Lyrics scroll independently, and playback continues while browsing the home page or playlist. Use **A− / A+** to adjust lyric size.

Kalyani and Manasilayo include **Karaoke / Original** radio buttons. Changing versions preserves the current musical position and whether playback is playing or paused. The other four songs include karaoke audio.

1. Kalyani — Kannada-script lyrics
2. Mere Sapno Ki Rani — Hindi lyrics
3. O Jane Jana — Hindi lyrics
4. Aa Aa Aye (Mera Dil Na Todo) — Romanized lyrics
5. Manasilayo — Kannada-script lyrics
6. Na Na Na Na Na Re — Roman-script lyrics, karaoke with chorus

## Files

- `index.html`: app pages and all lyrics
- `assets/app.css`: layout, colors, and local font definitions
- `assets/player.js`: navigation and persistent music player
- `assets/audio/`: eight audio versions
- `assets/fonts/`: bundled Noto fonts
- `licenses/`: SIL Open Font License notices for the bundled fonts
- `.nojekyll`: serves the files directly on GitHub Pages

The app uses relative asset paths, so it works at a GitHub Pages project URL such as `https://capgujaran.github.io/RaagaRoomApp/`. No build step, framework, external font provider, or other remote service is required.

Mere Sapno Ki Rani and O Jane Jana use 256 kbps web audio copies with the original duration, sample rate, and channels. Na Na Na Na Na Re uses a smaller 128 kbps web copy, served as seven binary parts. The player downloads and joins those parts into one cached MP3 when the song is selected; after loading, playback and seeking work normally. The remaining audio files retain the uploaded versions.

For a local preview, run `python3 -m http.server 8000` in this directory, then visit `http://localhost:8000`.

## GitHub Pages setup

In the repository, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, select **main** and **/(root)**, then **Save**. No workflow file or build step is needed.

After GitHub Pages finishes deploying, the expected share link is [https://capgujaran.github.io/RaagaRoomApp/](https://capgujaran.github.io/RaagaRoomApp/).

## Font attribution

Noto Sans Kannada and Noto Sans are distributed under the SIL Open Font License 1.1. Full copyright and license notices are included in `licenses/`. These licenses apply to the bundled fonts.
