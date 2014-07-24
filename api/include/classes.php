<?php
date_default_timezone_set('America/Los_Angeles');
//SCHEDULE_FILE stores channel configuration and video history
define('SCHEDULE_FILE', 'schedule.xml');
//Don't replay any video until REPEAT_ALLOWANCE seconds have passed
define('REPEAT_ALLOWANCE', 2.5 * (24 * 60 * 60));

//TvSchedule: Accesses channel names
class TvSchedule {
  
  private $xml,
          $channels;
  
  function __construct() {
    $this->xml = new PrettySimpleXMLElement(file_get_contents(SCHEDULE_FILE));
    $this->setChannels();
  }
  
  function setChannels(){
    $this->channels = $this->xml->xpath("//channel");
  }
  
  function getChannels(){
    return $this->channels;
  }
  
  //Returns a list of channel names
  function getChannelNames(){
    $channelNames = array();
    
    foreach($this->getChannels() as $channel){
      array_push($channelNames, (string) $channel->attributes()->name);
    }
    
    return $channelNames;
  }
}

//Channel: Accesses a channel's video history
class Channel {

  private $xml,
          $channel,
          $history,
          $video;

  function __construct($channelName) {
    $this->xml = new PrettySimpleXMLElement(file_get_contents(SCHEDULE_FILE));
    $this->setChannel($channelName);
    $this->setHistory();
    $this->removeOldVideos();
  }

  function setChannel($name) {
    $this->channel = current($this->xml->xpath("//channel[@name='" . $name . "']"));
  }

  function setHistory() {
    $this->history = current($this->channel->xpath("history"));
  }
  
  function isVideoFinished($video){
    return time() >= ($video->datePlayed + $video->length);
  }
  
  function isVideoInHistory($video){
    return (bool) $this->history->xpath("video[id = '" . $video->id . "']");
  }
  
  //Checks video existance, as well as if the video has already been played
  function isVideoInvalid($video){
    return empty($video) || ($this->isVideoInHistory($video) && $this->isVideoFinished($video));
  }

  function setVideo($video){
    $this->video = $video;
  }

  function getVideo() {
    $video = current($this->history->xpath("video[last()]"));
    
    //If the video is over, find a video on YouTube that isn't already in video history
    if($this->isVideoInvalid($video)){
      $youtube = new Youtubes;
      
      do {
        $video = $youtube->findVideo($this->getProgram()->episode);
      } while($this->isVideoInHistory($video));
      
      $this->saveVideo($video);
    }
    
    $this->setVideo($video);
    
    $this->video->secondsPlayed = time() - $this->video->datePlayed;
    return $this->video;
  }
  
  //Saves to video history
  function saveVideo($video) {
    $program = $this->history->addChild("video");
    $program->addChild("title", $video->title);
    $program->addChild("id", $video->id);
    $program->addChild("length", $video->length);
    $program->addChild("datePlayed", $video->datePlayed);

    $this->saveXml();
  }
  
  function getPrograms(){
    return $this->channel->xpath("program");
  }
  
  //Returns a random program in the channel lineup
  function getProgram() {
    $programs = $this->getPrograms();
    return $programs[array_rand($programs)];
  }

  //Remove any videos played over REPEAT_ALLOWANCE seconds ago
  function removeOldVideos() {
    $oldEntries = $this->history->xpath("video[" . (integer) (time() - REPEAT_ALLOWANCE) . " >= datePlayed]");
    
    foreach ($oldEntries as $entry) {
      $domRef = dom_import_simplexml($entry);
      $domRef->parentNode->removeChild($domRef);
      
      if($entry == end($oldEntries)){
        $this->saveXml();
      }
    }
  }

  function saveXml() {
    $this->xml->asXML(SCHEDULE_FILE);
  }
}

//Youtubes: Searches YouTube for episodes containing program titles
class Youtubes {

  private $result,
          $resultOffset = 0;

  function findVideo($title) {
    //If we've already searched and have a result set, get the next result entry
    if ($this->result) {
      $this->resultOffset++;
    } else {
      //Search for videos over 20 minutes that can be embeded and are free to watch
      $this->result = simplexml_load_file("http://gdata.youtube.com/feeds/api/videos/?v=2&duration=long&format=5&paid-content=false&prettyprint=true&q={$title}+episode");
    }

    $media = $this->result->entry[$this->resultOffset]->children("http://search.yahoo.com/mrss/")->group;
    $statistics = $media->children("http://gdata.youtube.com/schemas/2007");

    return (object) array(
      'title'       => (string) $media->title,
      'id'          => (string) $statistics->videoid,
      'length'      => (string) $statistics->duration->attributes()->seconds,
      'datePlayed'  => (string) time()
    );
  }
}

//PrettySimpleXMLElement: Extension of SimpleXMLElement
class PrettySimpleXMLElement extends SimpleXMLElement {
  //Exports XML in pretty format
  function asXML($filename = null) {
    $dom = new DOMDocument('1.0');
    $dom->preserveWhiteSpace = false;
    $dom->formatOutput = true;
    $dom->loadXML(parent::asXML());
    
    if(is_null($filename)){
      return $dom->saveXML();
    }else{
      $dom->save($filename);
    }
  }
  
  //Escapes values when adding an XML child node
  function addChild($name, $value = null, $namespace = null) {
    if(!empty($value)){
      $value = htmlspecialchars($value, ENT_QUOTES | ENT_XML1, 'UTF-8');
    }
    return parent::addChild($name, $value, $namespace);
  }
}
?>