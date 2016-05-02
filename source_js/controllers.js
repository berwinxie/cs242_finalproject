var musicControllers = angular.module('musicControllers', []);

musicControllers.controller('ReplayController', ['$scope', '$routeParams', '$http', '$timeout', function($scope, $routeParams, $http, $timeout) {
  $scope.whichInstrument = $routeParams.whichInstrument;
  // console.log('cur instrument:' + $scope.whichInstrument);
  $scope.instrument = {};
  $scope.song = {};
  $scope.voiceList = responsiveVoice.getVoices();
  // console.log($scope.voiceList);
  // allows us to keep how much time as elapsed in ms
  $scope.startTime = new Date().getTime();
  // console.log($scope.startTime);

  $scope.visible = {
    keyboard: false,
    drums: false,
    voice: false
  }

  $scope.playedNotes = [];
  $scope.synth = new Tone.PolySynth(4, Tone.SimpleSynth).toMaster();

  //and a compressor
  $scope.drumCompress = new Tone.Compressor({
    "threshold" : -30,
    "ratio" : 6,
    "attack" : 0.3,
    "release" : 0.1
  }).toMaster();
  $scope.distortion = new Tone.Distortion({
    "distortion" : 0.4,
    "wet" : 0.4
  });
  //hats
  $scope.hats = new Tone.Sampler("./data/audio/hh.mp3", {
    // "volume" : -10,
    "envelope" : {
      "attack" : 0.001,
      "decay" : 0.02,
      "sustain" : 0.01,
      "release" : 0.01
    },
    "filterEnvelope" : {
      "attack" : 0.001,
      "decay" : 0.02,
      "sustain" : 1,
      "baseFrequency" : 6000,
      "octaves" : -3.3
    },
    "filter" : {
      "type" : "highpass"
    }
  }).chain($scope.distortion, $scope.drumCompress);

  //SNARE PART
  $scope.snare = new Tone.Sampler("./data/audio/snare.mp3", {
    "envelope" : {
      "attack" : 0.01,
      "decay" : 0.05,
      "sustain" : 0
    },
    "filterEnvelope" : {
      "attack" : 0.001,
      "decay" : 0.01,
      "sustain" : 0,
      "baseFrequency" : 3000,
      "octaves" : 2
    },
  }).chain($scope.distortion, $scope.drumCompress);

  $scope.kick = new Tone.DrumSynth({
      "pitchDecay" : 0.01,
      "octaves" : 6,
      "oscillator" : {
        "type" : "square4"
      },
      "envelope" : {
        "attack" : 0.001,
        "decay" : 0.2,
        "sustain" : 0
      }
    }).connect($scope.drumCompress);

  $scope.bass = new Tone.SimpleFM({
      "harmonicity" : 1,
      "modulationIndex" : 3.5,
      "carrier" : {
        "oscillator" : {
          "type" : "custom",
          "partials" : [0, 1, 0, 2]
        },
        "envelope" : {
          "attack" : 0.08,
          "decay" : 0.3,
          "sustain" : 0,
        },
      },
      "modulator" : {
        "oscillator" : {
          "type" : "square"
        },
        "envelope" : {
          "attack" : 0.1,
          "decay" : 0.2,
          "sustain" : 0.3,
          "release" : 0.01
        },
      }
    }).toMaster();

  // set drums to visible
  if ($scope.whichInstrument == 'piano') {
    $scope.visible.keyboard = true;
    $scope.visible.drums = false;
    $scope.visible.voice = false;
  }
  if ($scope.whichInstrument == 'drums'){
    $scope.visible.keyboard = false;
    $scope.visible.drums = true;
    $scope.visible.voice = false;
  }
  if ($scope.whichInstrument == 'voice'){
    $scope.visible.keyboard = false;
    $scope.visible.drums = false;
    $scope.visible.voice = true;
  }

  /*
    update the notes on the page based on the played notes
    each data point will be {note, user, instrument?}
  */
  $scope.addNotes = function(note) {
    $scope.playNote(note.playedNote, note.duration, note.drumType, note.instrument);

    // if drum, change note.playedNote to drumtype
    if(note.instrument == 'drums') {
      note.playedNote = note.drumType;
    }
    $scope.playedNotes.push(note);

    // this will update the scope
    $scope.$digest();
  }

  /*
    play note for just 0.5 second
  */
  $scope.playNote = function(note, duration, drumType, instrument) {
    if (instrument === 'piano') {
      $scope.synth.triggerAttackRelease(note, duration);
    }
    // drums is special case
    // need to check drum type as well
    else if (instrument === 'drums') {
      if (drumType == 'snare') {
        $scope.snare.triggerAttackRelease(note, 0.5);
      }
      if (drumType == 'kick') {
        $scope.kick.triggerAttackRelease(note, 0.5);
      }
      if (drumType == 'hats') {
        $scope.hats.triggerAttackRelease(note, 0.5);
      }
      if (drumType == 'bass'){
        $scope.bass.triggerAttackRelease(note, 0.5);
      }
    }
    else if (instrument === 'voice') {
      // need to refactor
      var voice = duration;
      var params = drumType;
      if (duration !== '' && duration !== undefined){
        responsiveVoice.speak(note, voice, params);
      }
      else {
        // no selected voice, so choose default
        responsiveVoice.speak(note, "US English Female", params);
      }
    }
  }

  /*
  Take in pasted data that we retrieve from copying a song in order to replay the song
  */
  $scope.playSong = function(inputtedData) {
    $scope.playedNotes = [];
    // convert string back into an object
    var notes = JSON.parse(inputtedData);
    for (var i = 0; i < notes.length; i++) {
      var note = notes[i];
      console.log(note);

      // poor design : need to refactor since I am overwriting playedNote $scope.addNotes()
      // this converts all the playedNote back to orig
      if(note.playedNote == 'snare' || note.playedNote == 'hats') {
        note.playedNote = 0;
      }
      if(note.playedNote == 'kick' || note.playedNote == 'bass') {
        note.playedNote = "C4";
      } 
    }

    // create all the timeouts so it gets played in the right order
    // https://coderwall.com/p/udpmtq/angularjs-use-timeout-not-settimeout
    $scope.timeInMs = 0;
    var curIndex = 0;
    var play = function() {
      if (notes[curIndex].timestamp < $scope.timeInMs) {
        note = notes[curIndex];
        console.log('note at ' + notes[curIndex].timestamp);
        // play the note that was just passed in the timestamp
        $scope.addNotes(note);
        // $scope.playNote(note.playedNote, note.duration, note.drumType, note.instrument);
        curIndex += 1;
        // reached the end of the song
        if (curIndex > notes.length) {
          return;
        }
      }
      // we're only updating every 10 ms
      $scope.timeInMs+= 10;
      console.log($scope.timeInMs)
      $timeout(play, 10);
    }
    $timeout(play, 10);
  }
}]);

musicControllers.controller('InstrumentController', ['$scope', '$routeParams', '$http','$timeout', function($scope, $routeParams, $http, $timeout) {
  $scope.whichInstrument = $routeParams.whichInstrument;
  // console.log('cur instrument:' + $scope.whichInstrument);
  $scope.instrument = {};
  $scope.song = {};
  $scope.voiceList = responsiveVoice.getVoices();
  // console.log($scope.voiceList);
  // allows us to keep how much time as elapsed in ms
  $scope.startTime = new Date().getTime();
  // console.log($scope.startTime);

  $scope.visible = {
    keyboard: false,
    drums: false,
    voice: false
  }

  $scope.playedNotes = [];
  $scope.synth = new Tone.PolySynth(4, Tone.SimpleSynth).toMaster();

  //and a compressor
  $scope.drumCompress = new Tone.Compressor({
    "threshold" : -30,
    "ratio" : 6,
    "attack" : 0.3,
    "release" : 0.1
  }).toMaster();
  $scope.distortion = new Tone.Distortion({
    "distortion" : 0.4,
    "wet" : 0.4
  });
  //hats
  $scope.hats = new Tone.Sampler("./data/audio/hh.mp3", {
    // "volume" : -10,
    "envelope" : {
      "attack" : 0.001,
      "decay" : 0.02,
      "sustain" : 0.01,
      "release" : 0.01
    },
    "filterEnvelope" : {
      "attack" : 0.001,
      "decay" : 0.02,
      "sustain" : 1,
      "baseFrequency" : 6000,
      "octaves" : -3.3
    },
    "filter" : {
      "type" : "highpass"
    }
  }).chain($scope.distortion, $scope.drumCompress);

  //SNARE PART
  $scope.snare = new Tone.Sampler("./data/audio/snare.mp3", {
    "envelope" : {
      "attack" : 0.01,
      "decay" : 0.05,
      "sustain" : 0
    },
    "filterEnvelope" : {
      "attack" : 0.001,
      "decay" : 0.01,
      "sustain" : 0,
      "baseFrequency" : 3000,
      "octaves" : 2
    },
  }).chain($scope.distortion, $scope.drumCompress);

  $scope.kick = new Tone.DrumSynth({
      "pitchDecay" : 0.01,
      "octaves" : 6,
      "oscillator" : {
        "type" : "square4"
      },
      "envelope" : {
        "attack" : 0.001,
        "decay" : 0.2,
        "sustain" : 0
      }
    }).connect($scope.drumCompress);

  $scope.bass = new Tone.SimpleFM({
      "harmonicity" : 1,
      "modulationIndex" : 3.5,
      "carrier" : {
        "oscillator" : {
          "type" : "custom",
          "partials" : [0, 1, 0, 2]
        },
        "envelope" : {
          "attack" : 0.08,
          "decay" : 0.3,
          "sustain" : 0,
        },
      },
      "modulator" : {
        "oscillator" : {
          "type" : "square"
        },
        "envelope" : {
          "attack" : 0.1,
          "decay" : 0.2,
          "sustain" : 0.3,
          "release" : 0.01
        },
      }
    }).toMaster();

  // set drums to visible
  if ($scope.whichInstrument == 'piano') {
    $scope.visible.keyboard = true;
    $scope.visible.drums = false;
    $scope.visible.voice = false;
  }
  if ($scope.whichInstrument == 'drums'){
    $scope.visible.keyboard = false;
    $scope.visible.drums = true;
    $scope.visible.voice = false;
  }
  if ($scope.whichInstrument == 'voice'){
    $scope.visible.keyboard = false;
    $scope.visible.drums = false;
    $scope.visible.voice = true;
  }
  


  $scope.socket = io.connect(window.location.href);

  $scope.socket.on('foundUser', function (data) { 
    console.log('connected');
    console.log(data);
  });


  // receive played notes from server
  $scope.socket.on('getNote', function (data) {
    console.log('got a note');
    // time stamp is number of ms from start
    var curtime = new Date().getTime();
    var timestamp = curtime - $scope.startTime;
    data.timestamp = timestamp;
    $scope.addNotes(data);
  });

  // send notes through web server
  $scope.sendNote = function(note, duration, drumType) {
    var username = $scope.username;
    if (username === '' || username === undefined) {
      // setting default name
      username = 'anon';
    }
    $scope.socket.emit('playNote', { note: note, duration: duration, message: 'Sent a note!', instrument: $scope.whichInstrument, username : username, drumType:drumType});
  }

  // send drum

  /*
    update the notes on the page based on the played notes
    each data point will be {note, user, instrument?}
  */
  $scope.addNotes = function(note) {
    $scope.playNote(note.playedNote, note.duration, note.drumType, note.instrument);

    // if drum, change note.playedNote to drumtype
    if(note.instrument == 'drums') {
      note.playedNote = note.drumType;
    }
    $scope.playedNotes.push(note);

    // this will update the scope
    $scope.$digest();
  }

  /*
    play note for just 0.5 second
  */
  $scope.playNote = function(note, duration, drumType, instrument) {
    if (instrument === 'piano') {
      $scope.synth.triggerAttackRelease(note, duration);
    }
    // drums is special case
    // need to check drum type as well
    else if (instrument === 'drums') {
      if (drumType == 'snare') {
        $scope.snare.triggerAttackRelease(note, 0.5);
      }
      if (drumType == 'kick') {
        $scope.kick.triggerAttackRelease(note, 0.5);
      }
      if (drumType == 'hats') {
        $scope.hats.triggerAttackRelease(note, 0.5);
      }
      if (drumType == 'bass'){
        $scope.bass.triggerAttackRelease(note, 0.5);
      }
    }
    else if (instrument === 'voice') {
      // need to refactor
      var voice = duration;
      var params = drumType;
      if (duration !== '' && duration !== undefined){
        responsiveVoice.speak(note, voice, params);
      }
      else {
        // no selected voice, so choose default
        responsiveVoice.speak(note, "US English Female", params);
      }
    }
  }

  /*
  Take in pasted data that we retrieve from copying a song in order to replay the song
  */
  $scope.playSong = function(inputtedData) {
    $scope.playedNotes = [];
    // convert string back into an object
    var notes = JSON.parse(inputtedData);
    for (var i = 0; i < notes.length; i++) {
      var note = notes[i];
      console.log(note);

      // poor design : need to refactor since I am overwriting playedNote $scope.addNotes()
      // this converts all the playedNote back to orig
      if(note.playedNote == 'snare' || note.playedNote == 'hats') {
        note.playedNote = 0;
      }
      if(note.playedNote == 'kick' || note.playedNote == 'bass') {
        note.playedNote = "C4";
      } 
    }

    // create all the timeouts so it gets played in the right order
    // https://coderwall.com/p/udpmtq/angularjs-use-timeout-not-settimeout
    $scope.timeInMs = 0;
    var curIndex = 0;
    var play = function() {
      if (notes[curIndex].timestamp < $scope.timeInMs) {
        note = notes[curIndex];
        console.log('note at ' + notes[curIndex].timestamp);
        // play the note that was just passed in the timestamp
        $scope.addNotes(note);
        // $scope.playNote(note.playedNote, note.duration, note.drumType, note.instrument);
        curIndex += 1;
        // reached the end of the song
        if (curIndex > notes.length) {
          return;
        }
      }
      // we're only updating every 10 ms
      $scope.timeInMs+= 10;
      console.log($scope.timeInMs)
      $timeout(play, 10);
    }
    $timeout(play, 10);
  }
}]);
