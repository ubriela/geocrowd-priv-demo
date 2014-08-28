<?php
header('Access-Control-Allow-Origin: *');

if (! defined ( 'BASEPATH' ))
	exit ( 'No direct script access allowed' );

$DATASET_URL = 'http://ubriela.cloudapp.net/dataset/?task=info';


class Geocast extends CI_Controller {
	function __construct() {
		parent::__construct ();
		$this->load->helper ( array (
				'form',
				'url',
				'download' 
		) );
		$this->load->library ( 'form_validation' );
	}
	
	
	
	/**
	 * Index Page for this controller
	 */
	public function index() {
		global $DATASET_URL;
		$response = file_get_contents ( $DATASET_URL );
		$response = json_decode ( $response );
		$data ['datasets'] = $response;
		$this->load->view ( 'templates/header' );
		$this->load->view ( 'home', $data );
		$this->load->view ( 'templates/footer.php' );
	}
	
	/**
	 * Load sample tasks
	 */
	public function tasks() {
		// the following code segment loads coordinates from txt file
		$dataset = $_GET ['dataset'];
		$file = 'res/' . $dataset . '_task.dat';
		
		$handle = @fopen ( $file, 'r' );
		$tasks = array ();
		if ($handle) {
			while ( ! feof ( $handle ) ) {
				$line = fgets ( $handle, 4096 );
				$tasks [] = $line;
			}
			fclose ( $handle );
		}
		
		// prepare xml data
		$task_idx = 0;
		if (! empty ( $tasks )) {
			header ( 'Content-type: text/xml' );
			echo "<tasks>";
			foreach ( $tasks as $task ) {
				$item = preg_split('/[\s]+/', $task);
				echo "<task>";
				echo "<lat>" . $item [0] . "</lat>";
				echo "<lng>" . $item [1] . "</lng>";
				echo "</task>";
				$task_idx ++;
				if ($task_idx >= 5)
					break;
			}
			echo "</tasks>";
		}
	}
	
	/**
	 * Load data sets from files
	 * @return boolean
	 */
	public function load_dataset() {
		//$this->load->helper ( 'download' );
		
		if (isset ( $_GET ['name'] ))
			$dataset = $_GET ['name'];
		else
			return False;
		
		$file = 'res/' . $dataset . '.dat';
		
		$data = file_get_contents ( $file );
		echo $data;
	}
	
	
	/**
	 * Display upload_form
	 */
	function upload_form()
	{
		$this->load->view('upload_form', array('error' => ''));
	}
	
	function do_upload()
	{
		$config['upload_path'] = 'res/';
		$config['allowed_types'] = '*';
		$config['max_size']	= '2048';	// Set to zero for no limit
		$config['max_filename']	= '20';
		$config['remove_spaces']	= True;
	
		$this->load->library('upload', $config);
	
		$field_name = 'dataset';
		if ( ! $this->upload->do_upload($field_name))
		{	
			$error = array('error' => $this->upload->display_errors());
			$this->load->view('upload_form', $error);
		}
		else
		{	
			$filename = $this->upload->data()['full_path'];
			//$filedata = file_get_contents ( $filename );
			if ($filename != '')
			{
				$headers = array("Content-Type:multipart/form-data"); // cURL headers for file uploading
				//$postfields = array("filedata" => "@$filedata", "filename" => $filename);
				$ch = curl_init("http://ubriela.cloudapp.net/upload");
				curl_setopt($ch, CURLOPT_HEADER, true);
				curl_setopt($ch, CURLOPT_POST, true);
				curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
// 				curl_setopt($ch, CURLOPT_POSTFIELDS, $postfields);
				curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
				
				$args['file'] = new CurlFile($filename);
				curl_setopt($ch, CURLOPT_POSTFIELDS, $args);
				
				curl_exec($ch);
				if(!curl_errno($ch))
				{
					$info = curl_getinfo($ch);
					if ($info['http_code'] == 200)
						$errmsg = "File uploaded successfully";
				}
				else
				{
					$errmsg = curl_error($ch);
				}
				curl_close($ch);
			}
	
			$data = array('upload_data' => $this->upload->data());
			$this->load->view('upload_success', $data);
		}
	}
}
