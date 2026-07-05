<?php

namespace App\Services\Admin\Concerns;

trait BuildsManagementQueries
{
    protected function applyDateFilters($query, array $filters): void
    {
        $query
            ->when($filters['created_from'] ?? null, fn ($query, string $date) => $query->whereDate('created_at', '>=', $date))
            ->when($filters['created_to'] ?? null, fn ($query, string $date) => $query->whereDate('created_at', '<=', $date))
            ->when($filters['updated_from'] ?? null, fn ($query, string $date) => $query->whereDate('updated_at', '>=', $date))
            ->when($filters['updated_to'] ?? null, fn ($query, string $date) => $query->whereDate('updated_at', '<=', $date));
    }
}
