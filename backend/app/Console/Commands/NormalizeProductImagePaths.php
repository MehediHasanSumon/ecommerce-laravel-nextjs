<?php

namespace App\Console\Commands;

use App\Models\ProductImage;
use App\Support\Media\PublicStorageImage;
use Illuminate\Console\Command;

class NormalizeProductImagePaths extends Command
{
    protected $signature = 'products:normalize-image-paths
        {--apply : Persist recoverable storage path normalizations}
        {--delete-invalid : Delete unrecoverable invalid product image records. Requires --apply.}';

    protected $description = 'Audit and normalize product image records to public storage paths.';

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');
        $deleteInvalid = (bool) $this->option('delete-invalid');

        if ($deleteInvalid && ! $apply) {
            $this->error('--delete-invalid requires --apply.');

            return self::FAILURE;
        }

        $summary = [
            'valid' => 0,
            'normalized' => 0,
            'invalid' => 0,
            'deleted' => 0,
        ];
        $samples = [];

        ProductImage::query()
            ->orderBy('id')
            ->chunkById(200, function ($images) use ($apply, $deleteInvalid, &$summary, &$samples): void {
                foreach ($images as $image) {
                    $original = (string) $image->url;
                    $path = PublicStorageImage::path($original);

                    if ($path === null) {
                        $summary['invalid']++;
                        $samples[] = ['id' => $image->id, 'value' => $original, 'action' => $deleteInvalid ? 'delete' : 'report'];
                        if ($deleteInvalid) {
                            $image->delete();
                            $summary['deleted']++;
                        }

                        continue;
                    }

                    if ($path === $original) {
                        $summary['valid']++;

                        continue;
                    }

                    $summary['normalized']++;
                    $samples[] = ['id' => $image->id, 'value' => $original, 'action' => "normalize to {$path}"];

                    if ($apply) {
                        $image->forceFill(['url' => $path])->save();
                    }
                }
            });

        $this->components->info(($apply ? 'Applied' : 'Dry-run').' product image path audit complete.');
        $this->table(['Metric', 'Count'], collect($summary)->map(fn (int $count, string $metric): array => [$metric, $count])->all());

        if ($samples !== []) {
            $this->table(['ID', 'Value', 'Action'], collect($samples)->take(20)->map(fn (array $sample): array => [
                $sample['id'],
                str($sample['value'])->limit(120),
                $sample['action'],
            ])->all());
        }

        return self::SUCCESS;
    }
}
