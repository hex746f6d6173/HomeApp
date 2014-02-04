<?php
$json=$_GET["temp"];
file_put_contents("temp.json", $json);
?>