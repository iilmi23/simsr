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

    public function hasRole(array|string $roles): bool
    {
        $currentRole = $this->role ?? 'ppc_staff';

        if (is_array($roles)) {
            return in_array($currentRole, $roles, true);
        }

        return $currentRole === $roles;
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isPpcStaff(): bool
    {
        return $this->role === 'ppc_staff';
    }

    public function isPpcSupervisor(): bool
    {
        return $this->role === 'ppc_supervisor';
    }

    public function isPpcManager(): bool
    {
        return $this->role === 'ppc_manager';
    }

    public function getRoleLabelAttribute(): string
    {
        return match ($this->role) {
            'admin' => 'Admin',
            'ppc_supervisor' => 'PPC Supervisor',
            'ppc_manager' => 'PPC Manager',
            default => 'PPC Staff',
        };
    }
}
