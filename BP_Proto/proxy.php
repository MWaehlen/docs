<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://www.mywai.org');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$apiKey  = 'sk-cD57tIEQWeueLwyPZ_8G4wQBasliSlglaxjq9cZtQ1Rz3-r6cNVhos7BaCZb1RLc6IFXaGuL7sq-dWyVLn1DSw';                          // neuen Key hier
$agentId = '9523e866-4982-47a8-a25a-067e4fd4aa21';

$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!is_array($body)) {
    $body = [];
}

$body['agentId'] = $agentId;   // ← camelCase, kein agent_id!

$ch = curl_init('https://api.langdock.com/agent/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
    ],
    CURLOPT_POSTFIELDS     => json_encode($body),
]);

$response  = curl_exec($ch);
$httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(500);
    echo json_encode(['error' => 'cURL error: ' . $curlError]);
    exit;
}

http_response_code($httpCode ?: 500);
echo $response;
