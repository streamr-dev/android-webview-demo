// importScripts('./webm-writer2.js')
// importScripts('./streamr-client.web.min.js')

let webmWriter = null;
let fileWritableStream = null;
let frameReader = null;
let audioFrameReader = null;

let audioEncoderSupported = false

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

/*function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}*/

//pass audiostream to function
//create audio encoder aac if possible
//check if config is supported
//read audioframes, encode

async function startRecording(fileHandle, frameStream, trackSettings, audioFrameStream, audioTrackSettings, uuid) {
  let frameCounter = 0;
  let audioFrameCounter = 0;

  /*const client = new StreamrClient({
    auth: {
        privateKey: "0xa9af751db1197ec8eed7e340d9aac1d2b4878ca9a8df27f08cd6931c845e94a9"
      },
      logLevel: 'trace'
  })*/

  // fileWritableStream = await fileHandle.createWritable();

  /*webmWriter = new WebMWriter({
      fileWriter: fileWritableStream,
      codec: 'VP9',
      width: trackSettings.width,
      height: trackSettings.height});*/

  frameReader = frameStream.getReader();
  audioFrameReader = audioFrameStream.getReader();

  const init = {
    output: async (chunk) => {
      let arr_buf = new ArrayBuffer(chunk.byteLength)
      //console.log('chunk size in bytes', chunk.byteLength)
      chunk.copyTo(arr_buf)
      const base64Chunk = arrayBufferToBase64(arr_buf)
      //const check = base64ToArrayBuffer(base64Chunk)
      // send chunks from worker to browser thread

      if (chunk instanceof EncodedAudioChunk) {
        //postmessage with type of audio or video
        //type: audio
        self.postMessage({type:'audio', chunk: base64Chunk, uuid: uuid})
      }
      if (chunk instanceof EncodedVideoChunk) {
        //type: video
        //update player to understand this
        self.postMessage({type:'video', chunk: base64Chunk, uuid: uuid})
      }

      //self.postMessage(base64Chunk)
      //const base64String = btoa(String.fromCharCode.apply(null, new Uint8Array(foo)));
      // const response = await client.publish("0x64a79123bbb4eb016a950d6c91a6c59d14f60c3f/webcodecs", base64Chunk)
      // console.log(response)
      //instead of webm writer, send over streamr network
      //convert to base64, send as is
      
      //webmWriter.addFrame(chunk);
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
  try {
      console.log(audioSupport?.supported)
      audioEncoder.configure(audioConfig)
      audioEncoderSupported = true
  } catch(error) {
    console.log(error)
  }
  

  //let audioEncoder = new AudioEncode
  if (audioEncoderSupported) {
      audioFrameReader.read().then(async function processAudioFrame({done,value}){
        let audioFrame = value;

        if(done) {
          await audioEncoder.flush()
          audioEncoder.close()
          return;
        }
        audioEncoder.encode(audioFrame)

        if(audioEncoder.encodeQueueSize <= 30) {
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
  }

  frameReader.read().then(async function processFrame({done, value}) {
    let frame = value;

    if(done) {
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
  // await webmWriter.complete();
  // fileWritableStream.close();
  frameReader = null;
  webmWriter = null;
  // fileWritableStream = null;
}

self.addEventListener('message', function(e) {
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
