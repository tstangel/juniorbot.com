//start here: called when the youtube api iframe has finished loading
function onYouTubeIframeAPIReady(){
  videoPlayer = new VideoPlayer();
  juniorBot = new JuniorBot();
  
  videoPlayer.setApplication(juniorBot);
  juniorBot.setVideoPlayer(videoPlayer);
  videoPlayer.newYoutubePlayer();
  
  $(videoPlayer).bind('playerReady', function(){
    if(localStorage.getItem('volume') != null)
      videoPlayer.setVolume(localStorage.getItem('volume'), false);
    
    juniorBot.init();
  });
    
  $('#channelUp').bind('click', (function(event){
    event.preventDefault();
    this.channelUp();
  }).bind(juniorBot));

  $('#channelDown').bind('click', (function(event){
    event.preventDefault();
    this.channelDown();
  }).bind(juniorBot));
  
  var volumeHeldTimeout;
  $('#volumeDown').bind('mousedown', function volumeHeldDown(){
    videoPlayer.volumeDown(2.5);
    volumeHeldTimeout = window.setTimeout(function(){
      volumeHeldDown();
    }, 70);
  }).bind('mouseup mouseleave click', function(event){
    event.preventDefault();
    window.clearTimeout(volumeHeldTimeout);
  });

  $('#volumeUp').bind('mousedown', function volumeHeldDown(){
    videoPlayer.volumeUp(2.5);
    volumeHeldTimeout = window.setTimeout(function(){
      volumeHeldDown();
    }, 70);
  }).bind('mouseup mouseleave click', function(event){
    event.preventDefault();
    window.clearTimeout(volumeHeldTimeout);
  });

  var volumeDisplayTimeout;
  $(videoPlayer).bind('volumeSet', function(){
    window.clearTimeout(volumeDisplayTimeout);    
    
    window.setTimeout((function(){
      $('#volumeDisplay div').css('width', this.getVolume() + '%');
      $('#volumeDisplay').show();
    }).bind(this), 30);
    
    volumeDisplayTimeout = window.setTimeout(function(){
      $('#volumeDisplay').hide();
    }, 2000);
  });
}

function JuniorBot(){
  this.channel;
  this.channelIndex = 0;
  this.channels = new Array();
  this.videoPlayer;
  this.videoPlayerOverlay = $('#static');
  this.videoPlayerOverlayDelay = 100;
}

JuniorBot.prototype = {
  init: function(){
    $(this).bind('channelsRetrieved', function(){
      var hash = window.location.hash;
      if(hash)
        this.setChannelIndex(this.getChannels().indexOf(hash.substring(1)));
      this.setChannel();
    }).bind('channelSet', function(){
      this.getVideoPlayer().mute();
      this.hidePlayer();
      this.setLocationHash(this.getChannel());
      this.retrieveVideo();
    });

    $(this.videoPlayer).bind('videoPlaying', (function(){
      this.getVideoPlayer().unMute();
      this.showPlayer();
    }).bind(this));
    $(this.videoPlayer).bind('videoEnded', this.retrieveVideo.bind(this));
    
    this.retrieveChannels();
  },
  
  setLocationHash: function(value){
    location.replace("#" + value);
  },
  
  getChannelIndex: function(){
    return this.channelIndex;
  },
  
  setChannelIndex: function(index){
    this.channelIndex = index;
  },
  
  channelUp: function(){
    if(this.getChannelIndex() == (this.getChannelCount() - 1)){
      this.setChannelIndex(0);
    }else{
      this.setChannelIndex(parseInt(this.getChannelIndex()) + 1);
    }
    this.setChannel();
  },
  
  channelDown: function(){
    if(this.getChannelIndex() === 0){
      this.setChannelIndex(this.getChannelCount() - 1);
    }else{
      this.setChannelIndex(this.getChannelIndex() - 1);
    }
    this.setChannel();
  },
    
  getVideoPlayerOverlay: function(){
    return this.videoPlayerOverlay;
  },
  
  showPlayer: function(){
    window.setTimeout((function(){
      this.getVideoPlayerOverlay().css('visibility', 'hidden');
    }).bind(this), this.videoPlayerOverlayDelay);
  },
  
  hidePlayer: function(){
    this.getVideoPlayerOverlay().css('visibility', 'visible');
  },
  
  setVideoPlayer: function(videoPlayer){
    this.videoPlayer = videoPlayer;
  },
  
  getVideoPlayer: function(){
    return this.videoPlayer;
  },
  
  setChannel: function(){
    this.channel = this.getChannels()[this.getChannelIndex()];
    $(this).trigger('channelSet');
  },
  
  getChannel: function(){
    return this.channel;
  },
  
  getChannels: function(){
    return this.channels;
  },
  
  setChannels: function(channels){
    this.channels = channels;
  },
  
  getChannelCount: function(){
    return this.getChannels().length;
  },
  
  retrieveVideo: function(){
    $.getJSON('api/channel/' + this.getChannel() + '/video', this.getVideoPlayer().playVideo.bind(this.getVideoPlayer()));
  },

  retrieveChannels: function(){
    $.getJSON('api/channels', (function(channels){
      this.setChannels(channels);
      $(this).trigger('channelsRetrieved');
    }).bind(this));
  }
}

function VideoPlayer() {
  this.player = window.youTubePlayer;
  this.application;
  this.placeholderId = 'player';
  this.playerConfig = {
    height: 419,
    width: 540,
    playerVars: {
      'autoplay': 0,
      'controls': 0,
      'disablekb': 1,
      'rel': 0,
      'wmode': 'transparent'
    },
    events: {
      'onReady': this.ready.bind(this),
      'onStateChange': this.playerStateChange.bind(this)
    }
  }
};

VideoPlayer.prototype = {
  ready: function(){
    $(this).trigger('playerReady');
  },
  
  setApplication: function(application){
    this.application = application;
  },
  
  newYoutubePlayer: function(){
    this.player = new YT.Player(this.placeholderId, this.playerConfig);
  },
    
  playVideo: function(data){
    this.getPlayer().loadVideoById({
      'videoId': data.id,
      'startSeconds': data.secondsPlayed,
      'suggestedQuality': 'large'
    });
  },
  
  getPlayer: function(){
    return this.player;
  },
  
  mute: function(){
    this.getPlayer().setVolume(0);
  },
  
  unMute: function(){
    this.setVolume(localStorage.getItem('volume') || 100, false);
  },

  volumeUp: function(amount){
    amount = (typeof(amount) == "undefined" ? 10 : amount);
    
    this.setVolume(this.getVolume() + amount);
  },
  
  volumeDown: function(amount){
    amount = (typeof(amount) == "undefined" ? 10 : amount);
    
    this.setVolume(this.getVolume() - amount);
  },
  
  setVolume: function(volume, fireEvent){
    fireEvent = (typeof(fireEvent) == 'undefined' ? true : fireEvent);
    
    if(volume > 100){
      volume = 100;
    }else if(volume < 0){
      volume = 0;
    }
    
    this.getPlayer().setVolume(volume);
    localStorage.setItem('volume', volume);
    
    if(fireEvent)
      $(this).trigger('volumeSet');
  },
  
  getVolume: function(){
    return this.getPlayer().getVolume();
  },

  playerStateChange: function(event){
    if(event.data == -1){
      $(this).trigger('videoUnstarted');
    }else if(event.data == 0){
      $(this).trigger('videoEnded');
    }else if(event.data == 3){
      $(this).trigger('videoPlaying');
    }
  }
}
