<?php

namespace App\Imports;

use App\Models\Assy;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\SkipsOnError;
use Maatwebsite\Excel\Concerns\SkipsErrors;
use Maatwebsite\Excel\Validators\Failure;
use Maatwebsite\Excel\Concerns\SkipsOnFailure;
use Maatwebsite\Excel\Concerns\Importable;

class AssyMasterImport implements ToModel, WithHeadingRow, WithValidation, SkipsOnError, SkipsOnFailure
{
    use Importable, SkipsErrors;
    
    private $carlineId;
    private $rowCount = 0;
    private $errors = [];
    
    public function __construct($carlineId)
    {
        $this->carlineId = $carlineId;
    }
    
    public function model(array $row)
    {
        $this->rowCount++;
        
        // Cek apakah assy_number sudah ada untuk carline ini
        $exists = Assy::where('assy_number', $row['assy_number'])
                            ->where('carline_id', $this->carlineId)
                            ->exists();
        
        if ($exists) {
            throw new \Exception("assy_number {$row['assy_number']} already exists for this Car Line");
        }
        
        return new Assy([
            'assy_number' => $row['assy_number'],
            'assy_code' => $row['assy_code'],
            'level' => $row['level'],
            'carline_id' => $this->carlineId,
            'type' => $row['type'] ?? null,
            'umh' => $row['umh'],
            'std_pack' => $row['std_pack'],
            'is_active' => true,
        ]);
    }
    
    public function rules(): array
    {
        return [
            'assy_number' => 'required|string',
            'assy_code' => 'required|string',
            'level' => 'required|integer',
            'umh' => 'required|numeric',
            'std_pack' => 'required|integer',
            'type' => 'nullable|string',
        ];
    }
    
    public function getRowCount()
    {
        return $this->rowCount;
    }
    
    public function onFailure(Failure ...$failures)
    {
        foreach ($failures as $failure) {
            $this->errors[] = "Row {$failure->row()}: " . implode(', ', $failure->errors());
        }
    }
    
    public function getErrors()
    {
        return $this->errors;
    }
}