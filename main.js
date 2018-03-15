var detect = require('bpm-detective');
var $ = require("jquery");
var FileSaver = require('file-saver');

var video = document.querySelector('video');
var audio = document.querySelector('audio');
var audioFile = document.getElementById("upload");
var mimeCodec = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
var bpm;
var audioDuration;
var loadFn;
var duration;
var delta;
var N;
var newAudio = false;
var offset = 0;
var videoSources;
var context = new (window.AudioContext || window.webKitAudioContext)(); // Audio context

if (!('MediaSource' in window && MediaSource.isTypeSupported(mimeCodec))) {
  writeLine('Compatibility failure.');
  console.error('Unsupported MIME type or codec: ', mimeCodec);
}


// Event listeners

$(video).on('seeked', function() { audio.currentTime = this.currentTime + offset; });

$(video).on('play', function() { audio.play(); });

$(video).on('pause', function() { audio.pause(); });

$('#offset').on('keyup keydown mouseup mousedown', function() {
  if (this.value != offset) {
    offset = parseFloat(this.value);
    audio.currentTime = video.currentTime + offset;
    writeLine('Audio offset: ' + roundDec(offset, 3));
  };
});

$('.shell-body').on('contentChange', function() { this.scrollTop = this.scrollHeight; });

$('#capture-button').click(captureVideo);

$('#upload').on('change', function() {
  newAudio = true;

  writeLine('Processing audio.')
  var file = $('#upload')[0].files[0];
  audio.src = URL.createObjectURL(file);

  offset = 0;
  $('#offset').val(offset);

  function get_bpm(callback) {
    var reader = new FileReader();
    reader.onload = function(ev) {
      context.decodeAudioData(ev.target.result, function(buffer) {
        bpm = detect(buffer);
        audioDuration = buffer.duration;
        console.log('Audio duration: ' + audioDuration);
        console.log('BPM: ' + bpm);
        callback(bpm, audioDuration);
      });
    };
    reader.readAsArrayBuffer(file);
  }

  get_bpm(function(bpm, audioDuration) {
    bpm = Math.round(bpm)
    $('#select-bpm').val(bpm);
    writeLine('Audio BPM: ' + bpm);
    newAudio = false;
  });

});

window.addEventListener('error', function(event) { writeLine('ERROR: ' + event.message) })

listDir('videos/', function(dirs) {
  $.each(dirs, function(index, value) {
    $('#videos').append($('<option>', {
      value: value.slice(0, -1),
      text: value.slice(0, -1)
    }));
  });
});


// Main functions

$('#submit').on('click', function() {
  if ($('#select-bpm').val() != '') {
    hideVideoBox();
    makeVid();
  }
});

function makeVid() {
  bpm = parseFloat($('#select-bpm').val()); // Do use rounded bpm

  duration = 0;
  var mult = parseFloat($('#select-mult').val())
  delta = mult * 60 / bpm;
  console.log('Delta: ' + delta)

  writeLine('Loading video files...')

  N = Math.ceil((audioDuration / delta));

  var category = $('#videos').find(":selected").val();

  if (category != '') {

    listDir('videos/' + category + '/', function(deltas) {
      deltaDir = closest(delta, deltas.map(x => parseFloat(x.slice(0, -1))));
      listDir('videos/' + category + '/' + deltaDir + '/', function(v) {
        videoSources = v.map(x => 'videos/' + category + '/' + deltaDir + '/' + x)
        videoSources = getRandom(videoSources, N);

        loadFn = downloadData;

        mediaSource = new MediaSource;
        video.src = URL.createObjectURL(mediaSource);
        mediaSource.addEventListener('sourceopen', sourceOpen);
      })
    })

  } else {

    videoSources = Array.from($('#video-upload')[0].files);
    videoSources = getRandom(videoSources, N);

    loadFn = loadData;

    mediaSource = new MediaSource;
    video.src = URL.createObjectURL(mediaSource);
    mediaSource.addEventListener('sourceopen', sourceOpen);

  }
}


function sourceOpen(e) {

  console.log('Adding SourceBuffer from MediaSource')

  sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
  sourceBuffer.mode = 'sequence';

  console.log('SourceBuffer mode set to ' + sourceBuffer.mode);

  sourceBuffer.addEventListener('updateend', function(e) {

    if (videoSources.length == 0) {
      console.log('Calling EOS');

      mediaSource.endOfStream();

      showVideoBox();
      video.currentTime = 0;
      play(video);

      writeLine('Complete.');

      return;
    }

    loadFn(videoSources.pop(), function(arrayBuffer) {
      pc = 100 * (1 - (videoSources.length / N));
      updateLine('Loading video files... ' + roundDec(pc, 3) + '%')

      console.log('Updating buffer at ' + duration);
      sourceBuffer.timestampOffset = duration;
      duration = duration + delta;
      sourceBuffer.appendBuffer(arrayBuffer);
    });
  });

  loadFn(videoSources.pop(), function(arrayBuffer) {
    console.log('Updating buffer at ' + duration);
    duration = duration + delta;
    sourceBuffer.appendBuffer(arrayBuffer);
  });

}

function downloadData(url, cb) {
  console.log("Downloading " + url);
  var xhr = new XMLHttpRequest;
  xhr.open('get', url);
  xhr.responseType = 'arraybuffer';
  xhr.onload = function () {
    cb(new Uint8Array(xhr.response));
  };
  xhr.send();
}

function loadData(file, callback) {
  var reader = new FileReader();
  reader.onload = function(ev) {
    callback(ev.target.result);
  };
  reader.readAsArrayBuffer(file);
}

function getRandom(arr, n) {
  if (arr.length == 0) {
    throw "Empty array";
  }
  // https://stackoverflow.com/questions/19269545/how-to-get-n-no-elements-randomly-from-an-array?lq=1
  var result = new Array(n),
      len = arr.length,
      taken = new Array(len);
  while (n--) {
    var x = Math.floor(Math.random() * len);
    result[n] = arr[x];
  }
  return result;
}

function replicateArray(array, n) {
  // https://stackoverflow.com/questions/30228902/duplicate-an-array-an-arbitrary-number-of-times-javascript
  var arrays = Array.apply(null, new Array(n));
  arrays = arrays.map(function() { return array });
  return [].concat.apply([], arrays);
}

function writeLine(text) {
  var $li = $("<li>", {"class": "typewriter"}).html(text);
  $('.shell-body').append($li);

  $('.shell-body').trigger('contentChange');

}

function updateLine(text) {
  $('.shell-body').find('li').last().html(text);
}

function roundDec(num, i) {
  return Math.round(num * 10**i) / 10**i;
}

var capturing = false;
function captureVideo() {
  if (!capturing) {
    capturing = true;

    if (typeof video.captureStream !== "undefined") {
      stream = video.captureStream();
      audioStream = audio.captureStream();

      stream.addTrack(audioStream.getAudioTracks()[0]);
      stream.removeTrack(stream.getAudioTracks()[0]);

      mediaRecorder = new MediaRecorder(stream);
      chunks = [];
      mediaRecorder.ondataavailable = function (e) {
          chunks.push(e.data);
      };

      video.currentTime = 0;
      play(video);
      mediaRecorder.start();
      $('video').on('ended', function() {mediaRecorder.stop()})

      $('#capture-button').text('Stop capturing').toggleClass('btn-primary btn-danger');

      mediaRecorder.onstop = function(e) {
        console.log("MediaRecorder.stop() was called.");
        var blob = new Blob(chunks, {'type': 'video/webm'});
        var blobURL = URL.createObjectURL(blob);
        writeLine('Download: <a href="' + blobURL + '">' + blobURL + '</a>');
        $('#capture-button').text('Capture video').toggleClass('btn-danger btn-primary');
        FileSaver.saveAs(blob, $('#upload')[0].files[0].name + '.webm');
        pause(video);
        $('video').off('ended');
      }
    } else {
      $('#capture-button').text("Your browser doesn't this feature (try Chrome)")
    }
  } else {
    capturing = false;
    mediaRecorder.stop();
  }
}


function play(video) {
  var isPlaying = video.currentTime > 0 && !video.paused && !video.ended && video.readyState > 2;

  if (!isPlaying) {
    video.play();
  }
}

function pause(video) {
  var playPromise = video.play();

  if (playPromise !== undefined) {
    playPromise.then(_ => {
      video.pause();
    })
  }
}

function listDir(path, cb) {
  console.log('Reading ' + path)
  var fileNames = new Array();
  $.ajax({
    url: path,
    success: function(data){
      $(data).find("a").each(function(){
        var name = $(this).attr("href");
        fileNames.push(name);
      });
      cb(fileNames);
    }
  });
}

function closest(x, array) {
  return array.sort((a, b) => Math.abs(x - a) - Math.abs(x - b))[0]
}

function hideVideoBox() {
  $('#video-box').hide();
  $('#progress-box').show();
  audio.pause();
}

function showVideoBox() {
  $('#video-box').show();
  $('#progress-box').hide();
}
