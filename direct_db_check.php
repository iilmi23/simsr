<?php

// Direct database connection test
$host = '127.0.0.1';
$port = '5432';
$dbname = 'simsr';
$user = 'postgres';
$password = '23102030';

try {
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    echo "Connected to PostgreSQL successfully!\n";

    // Check if srs table exists
    $result = $pdo->query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'srs')");
    $exists = $result->fetchColumn();
    echo "Table 'srs' exists: " . ($exists ? 'YES' : 'NO') . "\n";

    if ($exists) {
        // Count records
        $result = $pdo->query("SELECT COUNT(*) as count FROM srs");
        $count = $result->fetch()['count'];
        echo "Total records in srs table: $count\n";

        // Show sample records
        $result = $pdo->query("SELECT id, customer, part_number, qty, created_at FROM srs LIMIT 5");
        $records = $result->fetchAll();

        echo "\nSample records:\n";
        foreach ($records as $record) {
            echo "  - ID: {$record['id']}, Customer: {$record['customer']}, Part: {$record['part_number']}, Qty: {$record['qty']}\n";
        }
    }

} catch (PDOException $e) {
    echo "Connection failed: " . $e->getMessage() . "\n";
}