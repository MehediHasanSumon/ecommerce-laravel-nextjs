<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Admin\Concerns\HasManagementIndexRules;
use Illuminate\Foundation\Http\FormRequest;

class ListPermissionsRequest extends FormRequest
{
    use HasManagementIndexRules;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return $this->sharedRules(['name', 'created_at']);
    }
}
