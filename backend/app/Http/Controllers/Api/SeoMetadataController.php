<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\Seo\SeoMetadataService;
use Illuminate\Http\JsonResponse;

class SeoMetadataController extends Controller
{
    public function __construct(private readonly SeoMetadataService $metadata) {}

    public function defaults(): JsonResponse
    {
        return ApiResponse::success(['metadata' => $this->metadata->defaults()]);
    }

    public function entity(string $type, string $slug): JsonResponse
    {
        abort_unless(in_array($type, ['product', 'category', 'brand', 'collection', 'blog', 'content-page'], true), 404);

        $metadata = $this->metadata->entity($type, $slug);
        abort_if($metadata === null, 404);

        return ApiResponse::success(['metadata' => $metadata]);
    }

    public function sitemap(): JsonResponse
    {
        return ApiResponse::success(['items' => $this->metadata->sitemapEntries()]);
    }
}
