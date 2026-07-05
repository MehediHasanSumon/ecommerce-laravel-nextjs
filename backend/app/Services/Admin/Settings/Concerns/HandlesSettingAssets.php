<?php

namespace App\Services\Admin\Settings\Concerns;

use App\Services\Concerns\StoresPublicUploads;
use Illuminate\Http\UploadedFile;

trait HandlesSettingAssets
{
    use StoresPublicUploads;

    protected function storeAsset(UploadedFile $file, string $directory, ?string $oldPath = null): string
    {
        return $this->storePublicUpload($file, $directory, $oldPath);
    }
}
