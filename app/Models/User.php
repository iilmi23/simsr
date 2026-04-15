<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    protected function normalizeRole(string $role): string
    {
        return match ($role) {
            'staff', 'ppc_staff' => 'ppc_staff',
            default => $role,
        };
    }

    public function hasRole(array|string $roles): bool
    {
        $currentRole = $this->normalizeRole($this->role ?? 'staff');
        $roles = is_array($roles) ? $roles : [$roles];
        $normalizedRoles = array_map(fn ($role) => $this->normalizeRole($role), $roles);

        return in_array($currentRole, $normalizedRoles, true);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isStaff(): bool
    {
        return $this->hasRole(['staff', 'ppc_staff']);
    }

    public function getRoleLabelAttribute(): string
    {
        return match ($this->role) {
            'admin' => 'Admin',
            'ppc_staff', 'staff' => 'PPC Staff',
            'ppc_supervisor' => 'PPC Supervisor',
            'ppc_manager' => 'PPC Manager',
            default => 'Staff',
        };
    }
}
