import { IsBoolean, IsDateString, IsString, MaxLength, MinLength, Validate, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'IsFutureDate' })
class IsFutureDate implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return new Date(value) > new Date();
  }
  defaultMessage(): string {
    return 'dataEntrega deve ser uma data futura';
  }
}

export class CriarPedidoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nomeCliente: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  saborBolo: string;

  @IsDateString()
  @Validate(IsFutureDate)
  dataEntrega: string;

  @IsBoolean()
  possui_personalizados: boolean;
}
