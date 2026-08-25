<?php

namespace App\Console\Commands;

use App\Models\Settings\CompanySetting;
use App\Models\Settings\StoreSetting;
use App\Models\User;
use App\Services\Installation\AdminAccountInstaller;
use App\Services\Installation\ApplicationDefaultsInstaller;
use App\Services\Installation\InteractiveSettingsConfigurator;
use App\Services\Installation\RolePermissionInstaller;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Throwable;

class InstallApplication extends Command
{
    protected $signature = 'app:install
        {--company-name= : Set the company name directly}
        {--use-defaults : Use default company name without prompting}';

    protected $description = 'Quickly install and configure the application with company name, roles, permissions, and accounts';

    public function __construct(
        private readonly InteractiveSettingsConfigurator $settings,
        private readonly RolePermissionInstaller $roles,
        private readonly ApplicationDefaultsInstaller $defaults,
        private readonly AdminAccountInstaller $accounts,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        if (! $this->hasRequiredSchema()) {
            return self::FAILURE;
        }

        if (! $this->input->isInteractive()) {
            $this->components->error(
                'The installer requires an interactive terminal to collect administrator credentials.',
            );

            return self::FAILURE;
        }

        $this->newLine();
        $this->components->info('Application installer');
        $this->line('Existing records are updated in place, so this command can be run safely more than once.');

        try {
            $existingCompany = CompanySetting::query()->first();
            $defaultCompanyName = $existingCompany?->company_name ?: config('app.name', 'Ecommerce');

            $this->components->twoColumnDetail('Step 1 of 5', 'Company Name');
            if ($this->option('company-name')) {
                $companyName = (string) $this->option('company-name');
            } elseif ($this->option('use-defaults')) {
                $companyName = $defaultCompanyName;
            } else {
                $companyName = $this->askValidated(
                    'Company Name',
                    ['required', 'string', 'max:255'],
                    default: $defaultCompanyName,
                );
            }

            $companyValues = SettingsDefaults::company();
            if ($existingCompany) {
                $companyValues = array_merge($companyValues, array_filter($existingCompany->toArray(), fn ($v) => $v !== null));
            }
            $companyValues['company_name'] = $companyName;
            $companyValues['legal_company_name'] = $companyName.' Ltd.';
            $companyValues['invoice_footer'] = "Thank you for shopping with {$companyName}.";

            $existingStore = StoreSetting::query()->first();
            $storeValues = SettingsDefaults::store();
            if ($existingStore) {
                $storeValues = array_merge($storeValues, array_filter($existingStore->toArray(), fn ($v) => $v !== null));
            }

            $this->components->twoColumnDetail('Step 2 of 5', 'Super Admin Account');
            $superAdminData = $this->collectAccount('Super Admin');

            $this->components->twoColumnDetail('Step 3 of 5', 'Optional Admin Account');
            $adminData = $this->confirm('Would you like to create an Admin user?', false)
                ? $this->collectAccount('Admin', [$superAdminData['email']])
                : null;

            $this->components->twoColumnDetail('Step 4 of 5', 'Optional Customer Account');
            $excludedEmails = array_filter([$superAdminData['email'], $adminData['email'] ?? null]);
            $userData = $this->confirm('Would you like to create a Customer (User)?', false)
                ? $this->collectAccount('Customer', $excludedEmails)
                : null;

            $this->components->twoColumnDetail('Step 5 of 5', 'Installing');
            $summary = $this->install(
                $companyValues,
                $storeValues,
                $superAdminData,
                $adminData,
                $userData,
            );
        } catch (Throwable $exception) {
            report($exception);
            $this->components->error('Installation failed: '.$exception->getMessage());

            return self::FAILURE;
        }

        $this->newLine();
        $this->components->info('Installation completed successfully');
        $this->table(
            ['Item', 'Result'],
            [
                ['Company Name', $summary['company_name']],
                ['Roles', (string) $summary['roles']],
                ['Permissions', (string) $summary['permissions']],
                ['Super Admin', $summary['super_admin']],
                ['Admin', $summary['admin'] ?? 'Not created'],
                ['Customer (User)', $summary['user'] ?? 'Not created'],
            ],
        );

        return self::SUCCESS;
    }

    /**
     * @param  array<string, mixed>  $companyValues
     * @param  array<string, mixed>  $storeValues
     * @param  array<string, mixed>  $superAdminData
     * @param  array<string, mixed>|null  $adminData
     * @param  array<string, mixed>|null  $userData
     * @return array{roles: int, permissions: int, company_name: string, super_admin: string, admin: string|null, user: string|null}
     */
    private function install(
        array $companyValues,
        array $storeValues,
        array $superAdminData,
        ?array $adminData,
        ?array $userData = null,
    ): array {
        $progress = $this->output->createProgressBar(4);
        $progress->start();

        try {
            return DB::transaction(function () use (
                $companyValues,
                $storeValues,
                $superAdminData,
                $adminData,
                $userData,
                $progress,
            ): array {
                $this->settings->save(CompanySetting::class, $companyValues);
                $this->settings->save(StoreSetting::class, $storeValues);
                $progress->advance();

                $this->defaults->install();
                $progress->advance();

                $roleSummary = $this->roles->install();
                $progress->advance();

                $superAdmin = $this->accounts->install($superAdminData, 'super-admin');
                $admin = $adminData ? $this->accounts->install($adminData, 'admin') : null;
                $user = $userData ? $this->accounts->install($userData, 'user') : null;
                $progress->advance();

                return [
                    ...$roleSummary,
                    'company_name' => $companyValues['company_name'] ?? 'Ecommerce',
                    'super_admin' => "{$superAdmin->name} <{$superAdmin->email}>",
                    'admin' => $admin ? "{$admin->name} <{$admin->email}>" : null,
                    'user' => $user ? "{$user->name} <{$user->email}>" : null,
                ];
            });
        } finally {
            $progress->finish();
            $this->newLine(2);
            $this->clearSettingsCaches();
        }
    }

    /**
     * @param  list<string>|string|null  $differentFromEmail
     * @return array{name: string, email: string, phone?: string|null, password: string|null}
     */
    private function collectAccount(string $label, array|string|null $differentFromEmail = null): array
    {
        $excluded = is_array($differentFromEmail)
            ? $differentFromEmail
            : ($differentFromEmail !== null ? [$differentFromEmail] : []);

        $name = $this->askValidated(
            "{$label} name",
            ['required', 'string', 'max:255'],
        );
        $email = $this->askValidated(
            "{$label} email",
            ['required', 'email', 'max:255'],
            function (string $email) use ($excluded, $label): ?string {
                foreach ($excluded as $other) {
                    if (strcasecmp($email, $other) === 0) {
                        return "The {$label} email must be different from already specified accounts.";
                    }
                }

                return null;
            },
        );
        $existing = User::withTrashed()->where('email', $email)->first();

        if ($existing) {
            $this->line("Existing account found for {$email}; it will be updated and assigned the {$label} role.");
        }

        $data = [
            'name' => $name,
            'email' => $email,
            'password' => $this->askPassword($label, $existing !== null),
        ];

        if (Schema::hasColumn('users', 'phone')) {
            $data['phone'] = $this->askValidated(
                "{$label} mobile number (optional)",
                ['nullable', 'string', 'regex:/^\+?[0-9\s().-]{6,40}$/'],
                default: $existing?->phone,
                nullable: true,
            );
        }

        return $data;
    }

    private function askPassword(string $label, bool $existingUser): ?string
    {
        while (true) {
            $question = $existingUser
                ? "{$label} password (leave blank to keep the current password)"
                : "{$label} password";
            $password = $this->secret($question);

            if ($existingUser && blank($password)) {
                return null;
            }

            $confirmation = $this->secret("Confirm {$label} password");

            try {
                Validator::make(
                    ['password' => $password, 'password_confirmation' => $confirmation],
                    [
                        'password' => [
                            'required',
                            'confirmed',
                            Password::min(6),
                        ],
                    ],
                )->validate();

                return $password;
            } catch (ValidationException $exception) {
                $this->error(collect($exception->errors())->flatten()->first());
            }
        }
    }

    /**
     * @param  list<mixed>  $rules
     */
    private function askValidated(
        string $question,
        array $rules,
        ?callable $additionalValidation = null,
        mixed $default = null,
        bool $nullable = false,
    ): mixed {
        while (true) {
            $answer = $this->ask($question, $default);
            $answer = $nullable && blank($answer) ? null : $answer;

            try {
                $value = Validator::make(['value' => $answer], ['value' => $rules])->validate()['value'];
                $message = $additionalValidation ? $additionalValidation($value) : null;

                if ($message) {
                    $this->error($message);

                    continue;
                }

                return $value;
            } catch (ValidationException $exception) {
                $this->error(collect($exception->errors())->flatten()->first());
            }
        }
    }

    private function hasRequiredSchema(): bool
    {
        $requiredTables = [
            'company_settings',
            'store_settings',
            'users',
            'roles',
            'permissions',
        ];
        $missing = array_values(array_filter(
            $requiredTables,
            fn (string $table): bool => ! Schema::hasTable($table),
        ));

        if ($missing === []) {
            return true;
        }

        $this->components->error(
            'Required database tables are missing: '.implode(', ', $missing).'. Run php artisan migrate first.',
        );

        return false;
    }

    private function clearSettingsCaches(): void
    {
        foreach ([
            'settings.company',
            'settings.store',
            'settings.company.id',
            'settings.store.id',
            'navigation.public.runtime',
        ] as $key) {
            Cache::forget($key);
        }
    }
}
