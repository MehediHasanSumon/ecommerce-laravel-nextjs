<?php

namespace App\Services\Concerns;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

trait StoresPublicUploads
{
    protected function storePublicUpload(UploadedFile $file, string $directory, ?string $oldPath = null): string
    {
        $path = $file->store($directory, 'public');

        $this->deletePublicUpload($oldPath);

        return $this->publicUploadUrl($path);
    }

    protected function publicUploadUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        if (str_starts_with($path, '/storage/')) {
            return url($path);
        }

        if (str_starts_with($path, 'storage/')) {
            return url($path);
        }

        return Storage::disk('public')->url($path);
    }

    protected function deletePublicUpload(?string $pathOrUrl): void
    {
        if (! $pathOrUrl) {
            return;
        }

        $path = $this->publicPathFromUrl($pathOrUrl);

        if ($path !== '') {
            Storage::disk('public')->delete($path);
        }
    }

    private function publicPathFromUrl(string $pathOrUrl): string
    {
        $pathOrUrl = ltrim($pathOrUrl, '/');

        if (str_starts_with($pathOrUrl, 'storage/')) {
            return ltrim(substr($pathOrUrl, strlen('storage/')), '/');
        }

        if (! str_starts_with($pathOrUrl, 'http')) {
            return $pathOrUrl;
        }

        $prefix = rtrim(Storage::disk('public')->url(''), '/').'/';

        if (! str_starts_with($pathOrUrl, $prefix)) {
            return '';
        }

        return ltrim(str_replace($prefix, '', $pathOrUrl), '/');
    }
}
