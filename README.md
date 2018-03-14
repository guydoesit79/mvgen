# MVGen

## What is this

MVGen (Music Video Generator) dynamically generates music videos by putting together video chunks in a predefined, systematic manner. The resulting music video consistes of a many different scenes which are being alternated at a specific tempo, where the timing of the change is synced with the audio beat.

## Installation

- Clone the repo (`git clone https://github.com/oleg131/mvgen`).
- Deploy an HTTP server (any server will do, e.g. `python -m SimpleHTTPServer`).
- Go to the `index.html` location in your browser (preferrably Chrome).

## Usage

The interface of MVGen consists of the following fields,

- **Audio**: Audio file for the music video

- **Videos**: Video chunks for the music video. This is the most tricky part. Each chunk represents a scene that will need to be alternated. The files need to be fragmented MP4 encoded with `H.264`/`AAC`. If you have a full video that you want to split up, you can use ffmpeg and command `ffmpeg -i <input> -c:v libx264 -c:a aac -f segment -segment_time <time> -segment_format_options movflags=empty_moov+default_base_moof+frag_keyframe -reset_timestamps 1 <output_%d.mp4>`, where `<input>` is the path to the full video, `<time>` is the segment duration (in seconds) and `<output_%d.mp4>` is the output files (`%d` in the name is a counter and ensure files have different names). Because of the way ffmpeg works, some resulting files may be shorter than the specified duration, so you may want to remove them. Also, if the files are much longer than they are needed, the overlap may become glitchy. Remember, ideal scene duration is `number of scenes * 60 / bpm`.

- **Video category**: You may store the video chunks in a directory for easier access, grouped by categories. The path is `videos/<category>/<duration>/**.mp4`, where `<category>` is the category name and `<duration`> is the duration of the shortest video in that folder. If you're running the server locally, it's no different from just uploading the files using the file input above, however it is much slower, because the speed is limited by how fast your server can serve them.

- **Audio bpm**: bpm will be detected when a new audio is given but you can also change it afterwards.

- **Multiplier**: Number of scenes per beat, e.g. if bpm is 128 and number of scenes is 1, the scene will be changing 128 times per minute.

- **Offset**: Audio offset, that you can modify in case the video is out of sync with the audio. You can change this field during playback and it should be reflected immediately. You can also use arrows and keyboard to modify this.

## Capturing

Capturing is what it sounds like: it records the video as it plays. Only parts that are played will get recorded, which means that you have to sit through the entire video to capture it completely.

## Limitations

- The capturing functionality is not entirely robust and seems to only work in Chrome. The resulting file is a `webm` encoded with `H.264`/`Opus`. It doesn't always play correctly, so you may want to re-encode it into something more robust. Also, the audio offset will not reflect in the recording, yet.

- The size of the video buffer is limited, therefore only SD videos can be used for the most part. This can theoretically be solved by smart buffering and deleting unneeded parts.

## Thanks to

- MediaSource and MediaRecorder API,
- Web Audio API,
- ffmpeg,
- HTML5.
