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
        $middleware = $route->gatherMiddleware();
        echo 'middleware_count=' . count($middleware) . PHP_EOL;
        echo 'middleware_list=' . implode('|', $middleware) . PHP_EOL;
        foreach ($middleware as $m) {
            echo 'middleware_item:' . $m . PHP_EOL;
        }
        echo '-----' . PHP_EOL;
    }
}
