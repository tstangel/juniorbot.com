<?php
//Don't report errors
error_reporting(0);

require 'include/classes.php';
require 'Slim/Slim.php';

use Slim\Slim;
Slim::registerAutoloader();
$app = new Slim();

//Return a list of channels in JSON
$app->get('/channels', function () {
  $tvSchedule = new TvSchedule();
  echo json_encode($tvSchedule->getChannelNames());
});

//Returns the number of people watching a channel
//$app->get('/channel/:channelName/viewers', function($channelName) {
//  $channel = new Channel($channelName);
//  echo json_encode($channel->getViewers());
//});

//Return the current video for a channel in JSON
$app->get('/channel/:channelName/video', function ($channelName) {
  $channel = new Channel($channelName);
  echo json_encode($channel->getVideo());
});

$app->run();
?>
