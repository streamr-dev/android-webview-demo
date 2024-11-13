let webmWriter = null;
let fileWritableStream = null;
let frameReader = null;
let audioFrameReader = null;

function arrayBufferToBase64(arrayBuffer) {
  // Create a view on the ArrayBuffer
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

//pass audiostream to function
//create audio encoder aac if possible
//check if config is supported
//read audioframes, encode

async function startRecording(fileHandle, frameStream, trackSettings, audioFrameStream, audioTrackSettings, uuid) {
  let frameCounter = 0;
  let audioFrameCounter = 0;

  frameReader = frameStream.getReader();
  audioFrameReader = audioFrameStream.getReader();

  const init = {
    output: async (chunk) => {
      let arr_buf = new ArrayBuffer(chunk.byteLength)
      chunk.copyTo(arr_buf)
      const base64Chunk = arrayBufferToBase64(arr_buf)
      // send chunks from worker to browser thread

      if (chunk instanceof EncodedAudioChunk) {
        //postmessage with type of audio or video
        //type: audio
        self.postMessage({ type: 'audio', chunk: base64Chunk, uuid: uuid })
      }
      if (chunk instanceof EncodedVideoChunk) {
        //type: video
        //update player to understand this
        self.postMessage({ type: 'video', chunk: base64Chunk, uuid: uuid })
      }
    },
    error: (e) => {
      console.log(e.message);
      stopRecording();
    }
  };

  const config = {
    codec: "avc1.42002A",
    width: trackSettings.width,
    height: trackSettings.height,
    bitrate: 1e6,
    avc: { format: "annexb" },
    pt: 1
  };

  const audioConfig = {
    numberOfChannels: audioTrackSettings.channelCount,
    sampleRate: audioTrackSettings.sampleRate,
    codec: "mp4a.40.2",
    aac: { format: 'adts' },
    bitrate: 96000
  }

  let encoder = new VideoEncoder(init);
  let support = await VideoEncoder.isConfigSupported(config);
  console.assert(support.supported);
  encoder.configure(config);

  let audioEncoder = new AudioEncoder(init);
  let audioSupport = await AudioEncoder.isConfigSupported(audioConfig)
  console.assert(audioSupport.supported)
  audioEncoder.configure(audioConfig)


  audioFrameReader.read().then(async function processAudioFrame({ done, value }) {
    let audioFrame = value;

    if (done) {
      await audioEncoder.flush()
      audioEncoder.close()
      return;
    }
    audioEncoder.encode(audioFrame)

    if (audioEncoder.encodeQueueSize <= 30) {
      if (++audioFrameCounter % 1000 == 0) {
        console.log(audioFrameCounter + ' audio frames processed')
      }

      const insert_keyframe = (audioFrameCounter % 15) == 0;

    } else {
      console.log('dropping audio frame, encoder falling behind')
    }

    audioFrame.close()
    audioFrameReader.read().then(processAudioFrame)
  })

  frameReader.read().then(async function processFrame({ done, value }) {
    let frame = value;

    if (done) {
      await encoder.flush();
      encoder.close();
      return;
    }

    if (encoder.encodeQueueSize <= 30) {
      if (++frameCounter % 1000 == 0) {
        console.log(frameCounter + ' frames processed');
      }

      const insert_keyframe = (frameCounter % 15) == 0;
      encoder.encode(frame, { keyFrame: insert_keyframe });
    } else {
      console.log('dropping frame, encoder falling behind');
    }

    frame.close();
    frameReader.read().then(processFrame);
  });
}

async function stopRecording() {
  await frameReader.cancel();
  frameReader = null;
  webmWriter = null;
}

self.addEventListener('message', function (e) {
  switch (e.data.type) {
    case "start":
      startRecording(e.data.fileHandle, e.data.frameStream,
        e.data.trackSettings, e.data.audioFrameStream, e.data.audioTrackSettings, e.data.uuid);
      break;
    case "stop":
      stopRecording();
      break;
  }
});
