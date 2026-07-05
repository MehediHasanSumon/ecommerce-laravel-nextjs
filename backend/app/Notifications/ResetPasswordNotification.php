<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;

class ResetPasswordNotification extends ResetPassword
{
    public function toMail($notifiable): MailMessage
    {
        $url = config('auth_api.frontend_password_reset_url')
            .'?token='.urlencode($this->token)
            .'&email='.urlencode($notifiable->getEmailForPasswordReset());

        return (new MailMessage)
            ->subject('Reset your password')
            ->line('You are receiving this email because a password reset was requested for your account.')
            ->action('Reset Password', $url)
            ->line('This reset link expires in '.config('auth_api.password_reset_expiration_minutes').' minutes.')
            ->line('If you did not request a password reset, no action is required.');
    }
}
