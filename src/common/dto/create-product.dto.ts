import { Type } from "class-transformer";
import { IsNumber, IsPositive, IsString, Min, MinLength } from "class-validator";

export class CreateProductDto {

    @IsString()
    @MinLength(3)
    public name: string;

    @IsNumber(
        { 
            allowNaN: false,
            maxDecimalPlaces: 2,
        }
    )
    @IsPositive()
    @Type(() => Number)
    public price: number;
}
