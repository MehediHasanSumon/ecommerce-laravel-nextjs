<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\AdminNavigationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminNavigationController extends Controller
{
    public function __construct(private readonly AdminNavigationService $navigation) {}

    public function show(Request $request): JsonResponse
    {
        return ApiResponse::success([
            'navigation' => $this->navigation->for($request->user()),
        ]);
    }
}
