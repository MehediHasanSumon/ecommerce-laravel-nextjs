<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMarketingEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'event_id' => ['required', 'string', 'max:120', 'regex:/^[A-Za-z0-9._:-]+$/'],
            'event_name' => ['required', Rule::in(config('marketing.client_events', []))],
            'consent_status' => ['required', Rule::in(['granted', 'denied', 'unspecified'])],
            'event_url' => ['nullable', 'url:http,https', 'max:2000'],
            'page_title' => ['nullable', 'string', 'max:500'],
            'client_id' => ['nullable', 'string', 'max:191'],
            'session_id' => ['nullable', 'string', 'max:191'],
            'search_term' => ['nullable', 'string', 'max:500'],
            'content_name' => ['nullable', 'string', 'max:500'],
            'content_category' => ['nullable', 'string', 'max:255'],
            'transaction_id' => ['nullable', 'string', 'max:191'],
            'ecommerce' => ['nullable', 'array'],
            'ecommerce.currency' => ['nullable', 'string', 'size:3'],
            'ecommerce.value' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'ecommerce.tax' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'ecommerce.shipping' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'ecommerce.coupon' => ['nullable', 'string', 'max:191'],
            'ecommerce.items' => ['nullable', 'array', 'max:100'],
            'ecommerce.items.*.item_id' => ['required', 'string', 'max:191'],
            'ecommerce.items.*.item_name' => ['required', 'string', 'max:500'],
            'ecommerce.items.*.item_brand' => ['nullable', 'string', 'max:255'],
            'ecommerce.items.*.item_category' => ['nullable', 'string', 'max:255'],
            'ecommerce.items.*.item_variant' => ['nullable', 'string', 'max:255'],
            'ecommerce.items.*.price' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'ecommerce.items.*.quantity' => ['nullable', 'integer', 'min:1', 'max:10000'],
        ];
    }
}
