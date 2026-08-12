<?php

namespace App\Services\Concerns;

use App\Support\Media\PublicStorageImage;
use Illuminate\Http\UploadedFile;

trait StoresPublicUploads
{
    protected function storePublicUpload(UploadedFile $file, string $directory, ?string $oldPath = null): string
    {
        $path = $file->store($directory, 'public');

        $this->deletePublicUpload($oldPath);

        return $path;
    }

    protected function publicUploadUrl(?string $path): ?string
    {
        return PublicStorageImage::url($path);
    }

    protected function publicUploadPath(?string $pathOrUrl): ?string
    {
        return PublicStorageImage::path($pathOrUrl);
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
        return PublicStorageImage::path($pathOrUrl) ?? '';
    }
}
