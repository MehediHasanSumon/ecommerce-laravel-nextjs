<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SendCheckoutOtpRequest;
use App\Http\Requests\VerifyCheckoutOtpRequest;
use App\Http\Responses\ApiResponse;
use App\Services\Sms\CheckoutOtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CheckoutOtpController extends Controller
{
    public function __construct(private readonly CheckoutOtpService $otp) {}

    public function requirements(Request $request): JsonResponse
    {
        return ApiResponse::success($this->otp->requirements($request));
    }

    public function send(SendCheckoutOtpRequest $request): JsonResponse
    {
        return ApiResponse::success(
            $this->otp->issue($request, $request->validated('mobile')),
            'Verification code queued successfully.',
        );
    }

    public function verify(VerifyCheckoutOtpRequest $request): JsonResponse
    {
        $data = $request->validated();

        return ApiResponse::success(
            $this->otp->verify($request, $data['challenge_id'], $data['mobile'], $data['code']),
            'Mobile number verified successfully.',
        );
    }
}
