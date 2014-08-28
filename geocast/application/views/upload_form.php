<html>
<head>
<title>Upload Form</title>
</head>
<body>

<?php echo $error;?>

<?php
// echo form_open_multipart('geocast/do_upload');
echo form_open_multipart ( 'http://ubriela.cloudapp.net/upload' );
?>
	
<input type="file" name="dataset" size="2000" />

	<br />
	<br />

	<input type="submit" value="upload" />

	</form>

</body>
</html>