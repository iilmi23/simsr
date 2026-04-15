<?php
require __DIR__ . '/vendor/autoload.php';

$app = require __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$router = app('router');
$routes = $router->getRoutes();

foreach ($routes as $route) {
    if ($route->uri() === 'sr/upload') {
        echo 'uri=' . $route->uri() . PHP_EOL;
        echo 'name=' . $route->getName() . PHP_EOL;
        echo 'methods=' . implode(',', $route->methods()) . PHP_EOL;
        echo 'middleware=' . implode(',', $route->gatherMiddleware()) . PHP_EOL;
        echo 'action=' . $route->getActionName() . PHP_EOL;
        echo '-----' . PHP_EOL;
    }
}
