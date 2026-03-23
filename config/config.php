<?php
// config/config.php

// Database credentials
$db_host = getenv('DB_HOST') ?: ($_SERVER['HTTP_HOST'] == 'localhost' || $_SERVER['HTTP_HOST'] == '127.0.0.1' ? 'localhost' : 'sql211.infinityfree.com');
$db_user = getenv('DB_USER') ?: ($_SERVER['HTTP_HOST'] == 'localhost' || $_SERVER['HTTP_HOST'] == '127.0.0.1' ? 'root' : 'if0_41198642');
$db_pass = getenv('DB_PASS') ?: ($_SERVER['HTTP_HOST'] == 'localhost' || $_SERVER['HTTP_HOST'] == '127.0.0.1' ? '' : 'praveen1328');
$db_name = getenv('DB_NAME') ?: ($_SERVER['HTTP_HOST'] == 'localhost' || $_SERVER['HTTP_HOST'] == '127.0.0.1' ? 'praveen' : 'if0_41198642_praveen');

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Prevent PHP 8.1+ default fatal exceptions for mysqli
mysqli_report(MYSQLI_REPORT_OFF);

// Create connection
$conn = @new mysqli($db_host, $db_user, $db_pass, $db_name);

// Check connection
if ($conn->connect_error) {
    // Create a dummy connection object to prevent fatal errors in index.php
    $conn = new class {
        public $connect_error = true;
        public function query() { return false; }
        public function prepare() { return false; }
        public function real_escape_string($s) { return htmlspecialchars($s); }
        public function set_charset() {}
    };
} else {
    // Set charset to utf8mb4
    $conn->set_charset("utf8mb4");
}
?>