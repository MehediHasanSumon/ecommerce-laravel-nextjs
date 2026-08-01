<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FraudCheckResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $canViewRaw = (bool) $request->user()?->can('can_view_fraud_check');

        return [
            'id' => $this->public_id,
            'subject_type' => $this->subject_type,
            'subject_key' => $this->subject_key,
            'order' => $this->whenLoaded('order', fn () => $this->order ? [
                'id' => (string) $this->order->id,
                'order_number' => $this->order->order_number,
            ] : null),
            'customer' => $this->customer(),
            'input' => [
                'phone' => data_get($this->input_payload, 'phone'),
                'name' => data_get($this->input_payload, 'name'),
                'email' => data_get($this->input_payload, 'email'),
                'ip_address' => data_get($this->input_payload, 'ip_address'),
                'order_id' => data_get($this->input_payload, 'order_id'),
                'customer_id' => data_get($this->input_payload, 'customer_id'),
            ],
            'trigger' => $this->trigger,
            'is_automatic' => (bool) $this->is_automatic,
            'status' => $this->status,
            'risk_score' => (int) $this->risk_score,
            'risk_level' => $this->risk_level,
            'is_flagged' => (bool) $this->is_flagged,
            'blacklist_status' => $this->blacklist_status,
            'fraud_matches' => (int) $this->fraud_matches,
            'known_scam_reports' => (int) $this->known_scam_reports,
            'chargeback_reports' => (int) $this->chargeback_reports,
            'suspicious_activity_count' => (int) $this->suspicious_activity_count,
            'risk_reasons' => $this->risk_reasons ?: [],
            'recommendation' => $this->recommendation,
            'decision' => $this->decision ?: (object) [],
            'providers_requested' => (int) $this->providers_requested,
            'providers_succeeded' => (int) $this->providers_succeeded,
            'providers_failed' => (int) $this->providers_failed,
            'response_time_ms' => (int) $this->response_time_ms,
            'checked_at' => optional($this->checked_at)->toISOString(),
            'expires_at' => optional($this->expires_at)->toISOString(),
            'actor' => $this->whenLoaded('actor', fn () => $this->actor ? [
                'id' => $this->actor->id,
                'name' => $this->actor->name,
            ] : null),
            'providers' => $this->whenLoaded('providerResults', fn () => $this->providerResults->map(fn ($result): array => [
                'provider' => $result->provider,
                'status' => $result->status,
                'risk_score' => (int) $result->risk_score,
                'risk_level' => $result->risk_level,
                'blacklist_status' => $result->blacklist_status,
                'fraud_matches' => (int) $result->fraud_matches,
                'known_scam_reports' => (int) $result->known_scam_reports,
                'chargeback_reports' => (int) $result->chargeback_reports,
                'suspicious_activity_count' => (int) $result->suspicious_activity_count,
                'risk_reasons' => $result->risk_reasons ?: [],
                'recommendation' => $result->recommendation,
                'response_time_ms' => (int) $result->response_time_ms,
                'error_message' => $result->error_message,
                'raw_response' => $canViewRaw ? ($result->raw_response ?: (object) []) : null,
            ])->values()),
        ];
    }

    private function customer(): ?array
    {
        if ($this->relationLoaded('user') && $this->user) {
            return [
                'id' => "registered-{$this->user->id}",
                'type' => 'registered',
                'name' => $this->user->name,
                'email' => $this->user->email,
                'phone' => $this->user->phone,
            ];
        }
        if ($this->relationLoaded('guestCustomer') && $this->guestCustomer) {
            return [
                'id' => "guest-{$this->guestCustomer->id}",
                'type' => 'guest',
                'name' => $this->guestCustomer->name,
                'email' => $this->guestCustomer->email,
                'phone' => $this->guestCustomer->phone,
            ];
        }

        return null;
    }
}
