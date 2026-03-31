class SRMapperFactory
{
    public static function make($customer)
    {
        return match ($customer) {
            'JAI_TW' => new TYCMapper(),
            // nanti tambah:
            // 'JAI_JP' => new JAIMapper(),
            // 'SAI' => new SAIMapper(),
            // 'US' => new USMapper(),
        };
    }
}