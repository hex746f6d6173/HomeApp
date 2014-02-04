<?php
error_reporting("E_ALL");

$q=$_GET["q"];
$file="notify.json";
if($q=="add"){
	$fileContent=file_get_contents($file);
	$fileContent=$fileContent."".$_GET["file"].";\n";
	file_put_contents($file, $fileContent);
}
if($q=="start"){
	$hash=uniqid();
	$value["hash"]=$hash;
	$data="$hash;\n";
	file_put_contents($file, $data);
	
}
if($q=="send"){
	include("notify.php");
	$fileContent=file_get_contents($file);
	$filedef=$fileContent;
	

	$array=explode(";", $filedef);
	$images="";

	// set up basic connection
	$conn_id = ftp_connect("ftp.tomasharkema.nl");

	// login with username and password
	$login_result = ftp_login($conn_id, "snl147128", "dy7mfc1739");
	if (ftp_put($conn_id, "/tomasharkema.nl/photos.tomasharkema.nl/motion/notify.json", "motion/notify.json", FTP_BINARY)) {
				 echo "successfully uploaded /tomasharkema.nl/photos.tomasharkema.nl/motion/notify.json\n";
				} else {
				 echo "There was a problem while uploading /tomasharkema.nl/photos.tomasharkema.nl/motion/notify.json\n";
				}
				$i=0;
	foreach($array as $img){
		if($i!=0){
			//replace("\n","",$img);
			if($img!=end($array)){
				$imgex=explode("/",$img);
				$imgex=end($imgex);
				if (ftp_put($conn_id, "/tomasharkema.nl/photos.tomasharkema.nl/motion/".$imgex, "motion/".$imgex, FTP_BINARY)) {
				 echo "successfully uploaded $img\n";
				} else {
				 echo "There was a problem while uploading $img\n";
				}

				
				$images=$images."<img src=\"http://photos.tomasharkema.nl/motion/$imgex\"><br>";

			}
		}else{
			$hashh=$img;
			echo $hashh;
		}
		$i++;
	}

	
	$my_file = "/home/pi/www/home/html/$hashh.html";
	echo shell_exec("sudo touch $my_file");
	echo shell_exec("sudo chown -R www-data $my_file");
	$html="<html><head><title>Motion Report</title></head><body>".$images."</body></html>";
	if(file_put_contents("html/$hashh.html", $html)){
		echo "google";
	}else{
		echo "no google";
	}
	echo $html;

	if (ftp_put($conn_id, "/tomasharkema.nl/photos.tomasharkema.nl/motion/html/$hashh.html", $my_file, FTP_ASCII)){
		echo "Gelukt";
	}
	ftp_close($conn_id);
	notify("Motion Detected!","Motion Detected $images <a href=\"http://photos.tomasharkema.nl/motion/html/$hash.html\">Report</a><pre>".$img."</pre>");
	//file_put_contents($file, "");
	// close the connection
}

?>