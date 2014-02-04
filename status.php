<?php
$file=file_get_contents("status.json");
$content=json_decode($file);
$content=array_merge((array)$content, (array)$_GET);
$content=json_encode($content);
file_put_contents("status.json", $content);
echo json_encode($content);
?>