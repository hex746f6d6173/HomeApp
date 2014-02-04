<?php
function notify($message, $html){
$notif_post_data = array
(
	"user_credentials" => "2tUG33Op5_j0CK11FOQBxFaaX6cSKjSkWty5eWS3Ka8E8bfeSk2N1g",
	"notification[message]" => "$message",
	"notification[long_message]" => "<b>$message, $html</b>",
	"notification[title]" => "$message",
	"notification[long_message_preview]" => "$message",
	"notification[message_level]" => "0",
	"notification[silent]" => "0",
	"notification[action_loc_key]" => "Ga Naar APP!",
	"notification[run_command]" => "http://pi.local/home/",
	"notification[sound]" => "5.caf",
);

$notif_post_data_encoded = "";
foreach ( $notif_post_data as $k => $v )
	$notif_post_data_encoded .= ( $notif_post_data_encoded ? "&" : "" ) . rawurlencode( $k ) ."=". rawurlencode( $v );

$ch = curl_init();
curl_setopt( $ch, CURLOPT_URL, "https://www.appnotifications.com/account/notifications.xml" );
curl_setopt( $ch, CURLOPT_POSTFIELDS, $notif_post_data_encoded );
curl_setopt( $ch, CURLOPT_RETURNTRANSFER, 1 );
$result=curl_exec( $ch );
curl_close( $ch );

//$content=file_get_contents("http://photos.tomasharkema.nl/motion/mail.php?message=$message&html=$html");
$url = 'http://photos.tomasharkema.nl/motion/mail.php';
$fields = array(
            'message' => urlencode($message),
            'html' => urlencode($html)
        );

//url-ify the data for the POST
foreach($fields as $key=>$value) { $fields_string .= $key.'='.$value.'&'; }
rtrim($fields_string, '&');

//open connection
$ch = curl_init();

//set the url, number of POST vars, POST data
curl_setopt($ch,CURLOPT_URL, $url);
curl_setopt($ch,CURLOPT_POST, count($fields));
curl_setopt($ch,CURLOPT_POSTFIELDS, $fields_string);

//execute post
$result = curl_exec($ch);

//close connection
curl_close($ch);

unset( $notif_post_data, $notif_post_data_encoded );
return $result;
}
?>