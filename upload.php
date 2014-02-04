<?php
$file = 'notify.json';
$remote_file = '/tomasharkema.nl/photos.tomasharkema.nl/motion/notify.json';

// set up basic connection
$conn_id = ftp_connect("ftp.tomasharkema.nl");

// login with username and password
$login_result = ftp_login($conn_id, "snl147128", "dy7mfc1739");

// upload a file
if (ftp_put($conn_id, $remote_file, $file, FTP_ASCII)) {
 echo "successfully uploaded $file\n";
} else {
 echo "There was a problem while uploading $file\n";
}

// close the connection
ftp_close($conn_id);
?>