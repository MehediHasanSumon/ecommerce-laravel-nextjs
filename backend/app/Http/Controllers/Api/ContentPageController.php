<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ContentPageResource;
use App\Http\Responses\ApiResponse;
use App\Models\ContentPage;
use Illuminate\Http\JsonResponse;

class ContentPageController extends Controller
{
    public function show(string $slug): JsonResponse
    {
        $page = ContentPage::query()
            ->where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();

        return ApiResponse::success([
            'page' => ContentPageResource::make($page)->resolve(),
        ], 'Content page retrieved successfully.');
    }
}
