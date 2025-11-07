import { Transform, Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsObject, ValidateNested } from 'class-validator';

export class SendExtractionDto {
    @IsNotEmpty()
    @IsString()
    label: string;

    @IsNotEmpty()
    @IsObject()
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        }
        return value;
    })
    extraction_schema: Record<string, any>;

    @IsNotEmpty()
    @IsString()
    pdf_path: string;
}
