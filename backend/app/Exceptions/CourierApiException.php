<?php

namespace App\Exceptions;

use RuntimeException;

class CourierApiException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly ?int $statusCode = null,
        public readonly array $response = [],
    ) {
        parent::__construct($message);
    }
}
