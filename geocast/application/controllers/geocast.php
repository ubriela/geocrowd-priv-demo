<?php
if (! defined ( 'BASEPATH' ))
	exit ( 'No direct script access allowed' );

$DATASET_URL = 'http://ubriela.cloudapp.net/dataset';
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
		if (! empty ( $tasks )) {
			header ( 'Content-type: text/xml' );
			echo "<tasks>";
			foreach ( $tasks as $task ) {
				$item = preg_split('/[\s]+/', $task);
				echo "<task>";
				echo "<lat>" . $item [0] . "</lat>";
				echo "<lng>" . $item [1] . "</lng>";
				echo "</task>";
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
}
