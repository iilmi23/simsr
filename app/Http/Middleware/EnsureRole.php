<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string $roles)
    {
        $user = $request->user();
        $allowedRoles = array_map('trim', explode(',', $roles));

        if (! $user || ! $user->hasRole($allowedRoles)) {
            abort(Response::HTTP_FORBIDDEN, 'This action is unauthorized.');
        }

        return $next($request);
    }
}
