<?php

namespace App\Http\Resources\Admin\Settings;

use App\Services\Admin\Settings\CategoryDisplaySettingsService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryDisplaySettingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $mode = $this->category_display_mode ?: CategoryDisplaySettingsService::MODE_LANDING_PAGE;

        return [
            'id' => $this->id,
            'enable_home_category_section' => $mode === CategoryDisplaySettingsService::MODE_NAVBAR_DROPDOWN_ONLY
                ? false
                : (bool) $this->enable_home_category_section,
            'category_display_mode' => $mode,
            'categories_page_enabled' => $mode === CategoryDisplaySettingsService::MODE_LANDING_PAGE,
            'navbar_dropdown_enabled' => in_array($mode, [
                CategoryDisplaySettingsService::MODE_HOME_GRID_NAVBAR_DROPDOWN,
                CategoryDisplaySettingsService::MODE_NAVBAR_DROPDOWN_ONLY,
            ], true),
            'home_category_variant' => match ($mode) {
                CategoryDisplaySettingsService::MODE_HOME_GRID_NAVBAR_DROPDOWN => 'icon_grid',
                CategoryDisplaySettingsService::MODE_NAVBAR_DROPDOWN_ONLY => 'hidden',
                default => 'landing_cards',
            },
            'updated_at' => optional($this->updated_at)->toISOString(),
        ];
    }
}
